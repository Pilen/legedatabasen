var $=$;

var categories = [
    {name: "Sanselege"},
    {name: "Gemmelege"},
    {name: "Fangelege"},
    {name: "Boldlege"},
    {name: "Tonselege"},
    {name: "Alle lege"},
    {name: "Sanglege"},
    {name: "Hjernelege"},
    {name: "Bordlege"},
    {name: "Rundkredslege"},
    {name: "Banelege"}
];

var category = 5;  // Current category
var lege;          // List of all lege
var lege_urls = {}; // url -> lege
var state;
var been_at_front = false;
var search;
var category_swiper;
var total_time;
var menu_offset;

function init() {


    // Create categories
    categories.map(function(category, key) {
        category.index = key;
        category.url = (typeof category.url !== "undefined") ? category.url : category.name.toLocaleLowerCase().replace(" ", "_");
        category.image = category.image || category.name.replace(" ", "") + ".svg";
        var node = $('<div class="swiper-slide category outlined" id="'+key+'" ' +
                     'style="background-image: url(/images/categories/'+category.image+');">' +
                     category.name +
                     '</div>');
        node.appendTo(".swiper-wrapper");
    });

    // Create category swiper
    category_swiper = new Swiper(".swiper-container", {
        loop: true,
        centeredSlides: true,
        // slidesPerView: 7,
        slidesPerView: "auto",
        // prevButton: ".swiper-button-prev",
        // nextButton: ".swiper-button-next",
        pagination: ".swiper-pagination",
        paginationClickable: true,
        grabCursor: true,
        keyboardControl: true,
        initialSlide: category
    });
    // category_swiper.on("touchStart", function(swiper) {
    //     search.abort();
    // });
    category_swiper.on("slideChangeEnd", function(swiper) {
        total_time = +new Date();
        var selected = swiper.realIndex;
        $("#profiler").text(categories[selected].name);
        if (selected != category) {
            category = selected;
            showCategory(categories[selected], true /* No reset */);
        }
    });

    // Load lege
    $.getJSON("/data.json", function (data) {
        data = data.filter(function(d) {return d.name;}); // There is an empty leg with no name
        lege = data.map(function(leg, key) {
            leg.game_area = leg.area.length > 0 ? leg.area[0].area.toLocaleLowerCase() : "INGEN STEDER!";
            leg.age = age_group(leg.min_age);
            leg.duration = duration_group(leg.min_time);
            leg.participants = participants_group(leg.min_participants);
            leg.game_categories = leg.game_categories.filter(function(c) {return c.name.toLocaleLowerCase().indexOf("alle lege") == -1;});
            lege_urls[leg.url] = leg;

            if (leg.images.length > 0) {
                var image = '/images/entries/' + leg.images[0]['list'];
                var classes = "";
            } else {
                if (leg.game_categories.length > 0) {
                    var image = "/images/lege/" + leg.game_categories[0].name + "-default.png";
                    var classes = "default";
                } else {
                    var image = "/images/lege/default.png";
                    var classes = "";
                }
            }

            leg.node = $(
                ('<a href="leg/'+leg.url+'" class="element-item '+leg.tags+'" data-category="'+leg.inde+'" score=0 title="'+leg.name+'">'+
                 '<div class="leg '+ classes +'">'+
                 '<img data-src="' + image + '" class="leg-box-image lazy" src="">' +
                 '<p class="navn outlined">'+leg.name+'</p>'+
                 (leg.videos.length > 0 ? '<p class="pull-right outlined fdficon" style="font-size:20pt;font-weight:400;padding:10px;">&#xf407;</p>' : '')+
                 '<div class="infobar">'+
                 '<table style="width:100%;">'+
                 '<tbody>'+
                 '<tr>'+
                 '<td style="width:5%"><span class="fdficon" style="font-size:25pt;">&#xf405;</span></td><td style="width:10%">' + leg.participants + '</td>'+
                 '<td style="width:5%"><span class="fdficon" style="font-size:25pt;">&#xf3ba;</span></td><td style="width:15%">' + leg.duration + ' min</td>'+
                 '<td style="width:5%"><span class="fdficon" style="font-size:25pt;">&#xf41e;</span></td><td style="width:10%">' + leg.age + '+</td>'+
                 '<td style="width:5%"><span class="fdficon" style="font-size:25pt;">&#xf360;</span></td><td style="width:15%">' + leg.game_area + '</td>'+
                 '</tr>'+
                 '</tbody>'+
                 '</table>'+
                 '</div>'+
                 '</div>'+
                 '</a>'));
            leg.node.appendTo('#lege');
            return leg;
        });

        search = new SearchEngine()
            .method("plain")
            .delay(500)
            .add_field("description")
            .add_field("name", 10)
        // .add_field("tags", 9)
        // .add_field(auto_tags, 1)
            .id("url")
            .add(lege)
            .create_filter("category", function(leg, arg) {
                // Only keep lege where the category is found in the tags
                // return leg.tags.toLowerCase().indexOf(arg) != -1;
                if (arg == "Alle lege") {
                    return true;
                }
                var categories = leg.game_categories.map(function(c){return c.name;}).join(",");
                return categories.indexOf(arg) != -1;
            }, function(arg) {return arg || "";})
            .create_filter("participants", function(leg, arg) {
                return !arg || leg.participants == arg;
            }, function(arg) {return arg || "";})
            .create_filter("duration", function(leg, arg) {
                return !arg || leg.duration == arg;
            }, function(arg) {return arg || "";})
            .create_filter("age", function(leg, arg) {
                return !arg || leg.age == arg;
            }, function(arg) {return arg || "";})
            .create_filter("location", function(leg, arg) {
                return !arg || leg.game_area == arg;
            }, function(arg) {return arg || "";})
            .callback(sort_lege)
            .compile();

        $("#search").on("input", search_update);
        function search_update(event) {
            var search_text = $("#search")[0].value;
            search_text = search_text.toLowerCase();
            magic(search_text);
            search.query(search_text);
        }

        $('.lazy').lazy();

        $(window).on('popstate', function() {
            route();
        });

        route();
    });

    $('#lege').on("click", "a", function(event){
        event.preventDefault();
        history.pushState({}, '', $(this).attr("href"));
        route();
        been_at_front = true;
        return false;
    });

    function closeLeg() {
        if (been_at_front) {
            window.history.back();
        } else {
            history.pushState({}, "", "/");
        }
    }
    $(".leg_back").on("click", closeLeg);

    $('#modal-leg').on('hide.bs.modal', function (e) {
        history.pushState({}, "", "/");
    });

    $("#swipe_knap").click(function() {
        showCategory(categories[category]);
    });
    $(".menu-icon").click(function() {
        showSubmenu();
    });
    $("#filter_knap").click(function() {
        showFilter();
    });
    $("#search-icon").click(function() {
        showSearch();
    });
    $("#search-done-icon").click(function() {
        showCategory(categories[category]);
    });

    function stickyMenu() {
        var position = $(this).scrollTop();
        if (position >= menu_offset) {
            $(".navigation").css("position", "fixed");
        } else {
            $(".navigation").css("position", "static");
        }
    }
    $(window).resize(function() {
        menu_offset = $(".navigation-filler").offset().top;
        stickyMenu();
    }).resize();
    $(window).scroll(function() {
        var state = "lege";
        stickyMenu();
        return;
        var position = $(this).scrollTop();

        if(state == "lege" && position >= 120) {
            $("#title").text(categories[category].name);
        } else if(state == "leg" && position >= 50) {
            $("#title").text(leg.name);
        } else {
            $("#title").text("");
        }
    });

    // $('.filter input[type=radio], .filter input[type=radio]+label').click(function() {
    $('.filter input[type=radio]').click(function() {
        console.log("input click");
        var radio = $(this);
        _ = radio;
        if (radio.data('waschecked') == true) {
            radio.prop('checked', false);
            radio.data('waschecked', false);
            search.update_filter(radio[0].name, undefined);
        } else {
            radio.data('waschecked', true);
            search.update_filter(radio[0].name, radio[0].value);
        }
        // remove was checked from other radios
        radio.siblings('input[name="rad"]').data('waschecked', false);


    });

    contactify();
};
$(document).ready(init);

function route() {
    // Close modal if shown
    if ($(".modal").is(":visible")) {
        $(".modal").modal("hide");
        return;
    }

    var url = window.location.pathname;
    url = url .replace("/lege3", "")
        .replace("/legedatabasen", "")
        .replace("/frontend", "");
    url = url.replace(/^\/|\/$/g, ""); // Trim off slashes at the start + end


    // Show leg
    if (url.startsWith("leg/")) {
        var leg = lege_urls[url.substring(4)];
        if (!leg) {
            show404();
            return;
        }
        showLeg(leg);
        return;
    }
    if (url.startsWith("kontakt")) {
        skriv_til_os();
        return;
    }
    // Show category
    if (url) {
        var cats = categories.filter(function(category) {
            return category.url == url;
        });
        if (cats.length != 1) {
            show404();
            return;
        }
        var cat = cats[0];
        if (category != cat.index) {
            $(".swiper-container")[0].swiper.slideTo(cat.index);
        }
        showCategory(cat);
        return;
    }
    // Show front (with previous category)
    if (!url) {
        showCategory(categories[category]);
        return;
    }

    // Error
    show404();
    return;
}

function show404() {
    $("#modal-leg .modal-body .leg-teaser").html("");
    $("#modal-leg .modal-body .leg-description").html("<h3>404</h3><p>Hmm, det ser ud til at siden du leder efter ikke findes. Vi har sendt Søren ud for at lede</p><p>Du er meget velkommen til at brokke dig til Legeudvalget imens.</p>");
    $("#modal-leg").modal("show");
}

function showLeg(leg) {
    _=leg;
    /*
      $("#container").hide();
      $("#filter_knap").hide();
      $("#soeg_knap").hide();
      $("#swipe_knap").hide();
    */

    var description = marked(leg.description.replace(/^#([^\s])/mg, "# $1"));
    d = description;
    var preparation = marked(leg.preparation.replace(/^#([^\s])/mg, "# $1"));
    var note = marked(leg.note.replace(/^#([^\s])/mg, "# $1"));
    // $("#leg").show();
    // $("#leg-navn").text(leg.name);
    // $("#leg-teaser").text(leg.teaser);
    // $("#leg-beskrivelse").html(description);
    //$(".navbar .leg_back").show();

    if (leg.images.length > 0) {
        var image = '/images/entries/' + leg.images[0]['detail'];
    } else {
        var image = "/images/lege/" + leg.game_categories[0].name + "-default.png";
    }
    $("#modal-leg #leg-presentation-image").remove();
    $("#modal-leg .modal-body .leg-description").before(
        '<figure id="leg-presentation-image">' +
            '<img src="' + image + '" class="img-responsive" id="leg-presentation-image" />' +
            '<figcaption>' +
            '<h3>' + leg.name + '</h3>' +
            '<div class="infobar">'+
            '<table style="width:100%;">'+
            '<tbody>'+
            '<tr>'+
            '<td style="width:5%"><span class="fdficon" style="font-size:20pt;">&#xf405;</span></td><td style="width:10%">' + leg.participants + '</td>'+
            '<td style="width:5%"><span class="fdficon" style="font-size:20pt;">&#xf3ba;</span></td><td style="width:15%">' + leg.duration + ' min</td>'+
            '<td style="width:5%"><span class="fdficon" style="font-size:20pt;">&#xf41e;</span></td><td style="width:10%">' + leg.age + '+</td>'+
            '<td style="width:5%"><span class="fdficon" style="font-size:20pt;">&#xf360;</span></td><td style="width:15%">' + leg.game_area + '</td>'+
            '</tr>'+
            '</tbody>'+
            '</table>'+
            '</div>'+
            '</figcaption>' +
            '</figure>');
    $("#modal-leg .modal-body .leg-teaser").html('<strong>' + leg.teaser + '</strong>');
    $("#modal-leg .modal-body .leg-description").html('<h3>Beskrivelse:</h3>' + description);
    if (preparation) {
        $("#modal-leg .modal-body .leg-description").append('<h3>Forberedelse</h3>' + preparation);
    }
    if (note) {
        $("#modal-leg .modal-body .leg-description").append('<h3>Noter:</h3>' + note);
    }
    /*
      $("#modal-title").text(leg.name);
      $(".modal-body").html(description);
    */
    contactify();
    $("#modal-leg").modal("show");
    ga('send', 'pageview', '/leg/' + leg.url);


}

function showCategory(category, noReset) {
    // rename_url(category.url);
    if (noReset) {
        search.update_filter("category", category.name);
    } else {
        resetDisplay().done(function(){
            search.update_filter("category", category.name);
            $("#filters2").slideUp(400, function() {
                $(".swiper-container").slideDown(400);
            });
        });
    }
}

function showSearch() {
    rename_url("");
    resetDisplay().done(function() {
        // $("#title").fadeOut(200, function() {
        $("#search-icon").fadeOut(200, function() {
            $("#search-done-icon").fadeIn(200);
        });
        $("#search").val("").fadeIn(200*2, function() {
            // $("#search-icon").addClass("active");
        });
        $("#search").focus();
        $(".swiper-container").slideUp(400);
        $("#filters2").slideUp(400);
        // });
    });
}
function showSubmenu() {
    if ($("#submenu").is(":visible")) {
        console.log("cat instead");
        return showCategory(category);
    }
    rename_url("");
    resetDisplay().done(function() {
        $(".swiper-container").slideUp(200, function() {
            $(".menu-icon").addClass("open");
            $("#submenu").slideDown(400, function() {
            });
        });
    });
}

function showFilter() {
    rename_url("");
    resetDisplay().done(function() {
        $(".swiper-container").slideUp(200, function() {
            $("#filters2").slideDown(400);
        });
    });
}

function resetDisplay() {
    var start_time = +new Date();
    search.clear();
    var promise1 = scrollToTop(400);
    promise1 = null; //We dont want to wait for scrollToTop anyway
    // $("#title").text("");
    var promise2 = $("#search:visible").slideUp(200, function() {
        $("#title").fadeIn(200);
    }).promise();
    var promise3 = $("#search-done-icon").slideUp(200, function() {
        $("#search-icon").fadeIn(200);
    }).promise();
    var promise4 = $("#submenu:visible").slideUp(200);

    $(".menu-icon").removeClass("open");

    $("#leg").hide();
    $("#container").show();
    $("#filter_knap").show();
    $("#soeg_knap").show();
    $("#swipe_knap").show();
    $(".navbar .leg_back").hide();
    return $.when(promise1, promise2, promise3, promise4);
}

function sort_lege(rankings) {
    _r=rankings;
    $("#profiler").text("sorting");
    var start_time = +new Date();
    lege.map(function(leg){
        leg.score = -1;
        leg.node.attr("score", -1);
        // leg.node.find(".score").text(-1);
    });
    rankings.map(function(ranked) {
        ranked.document.score = ranked.score;
        ranked.document.node.attr("score", ranked.score);
        // ranked.document.node.find(".score").text(ranked.score);
    });
    rankings.sort(function(a, b) {
        if (a.score == b.score) {
            return a.document.name.localeCompare(b.document.name);
        }
        return b.score - a.score;
    });


    // $("#lege").fadeOut(200);
    $("#lege").empty();
    var nodes = rankings.map(function(leg) {
        return leg.document.node;
    }, this);
    $("#lege").append(nodes);

    $("#lege").show();


    // $("#lege").fadeIn(200);

    // $("#lege").isotope("updateSortData").isotope();
    var end_time = +new Date();
    $("#profiler").text("lege: "+(end_time - start_time) +" total: " + (end_time - total_time));

    return;
}

function scrollToTop(duration) {
    var to = 0;
    var start = $(window).scrollTop();
    var change = to - start;
    var increment = 20;
    var deferred = $.Deferred();

    if (start == to) {
        deferred.resolve();
        return deferred.promise();
    }

    function animateScroll(elapsedTime) {
        elapsedTime += increment;
        var position = easeInOutQuart(elapsedTime, start, change, duration);
        $(window).scrollTop(position);
        if (elapsedTime < duration) {
            setTimeout(function() {animateScroll(elapsedTime);}, increment);
        } else {
            $(window).scrollTop(to);
            deferred.resolve();
        }
    };
    animateScroll(0);

    function ease(currentTime, start, change, duration) {
        currentTime /= duration/2;
        if (currentTime < 1) {
            return change /2 * currentTime * currentTime + start;
        } else {
            currentTime -= 1;
            return -change / 2 * (currentTime * (currentTime -2) -1) + start;
        }
    }

    function easeInOutQuart (t, s, c, d) {
        // t = currentTime, s = start, c = change, d = duration;
        if ((t/=d/2) < 1) return c/2*t*t*t*t + s;
        return -c/2 * ((t-=2)*t*t*t - 2) + s;
    };
    return deferred.promise();
}

function contactify() {
    var link = $("a[href^='/kontakt']") .click(function(event) {
        event.preventDefault();
        contact();
        return false;
    });
}
function contact() {
    var n = 0;
    var adds = [108, 3, -12, -2, 19, -11, 6, -1,  -6, 10, -13, 1, 7, -12, 8, 3, 8, -5, -53, 50, -7, 2, -39, 38, -2, 2, -56, 54, 7];

    var r = "";
    var i = 0;
    for (; i < 8; i++) {
        n += adds[i];
        r += String.fromCharCode(n);
    }
    var a = r;
    r = "";
    for (; i < 8+4; i++) {
        n += adds[i];
        r += String.fromCharCode(n);
    }
    var b = r;
    r = "";
    for (; i < 8+4+(4+2+1+3+1+3+1+2); i++) {
        n += adds[i];
        r += String.fromCharCode(n);
    }
    var c = r;
    if (!window.open(c, "")) {
        window[a][b] = c;
    }
}



function find_cat(leg) {
    return leg.game_categories.map(function(c) {return c.name;}).join(", ");
}

function undefined_or() {
    for (var i = 0; i < arguments.length; i++) {
        var argument = arguments[i];
        if (typeof argument !== "undefined") {
            return argument;
        }
    }
    return undefined;
}

var previous_url = "";
function rename_url(url) {
    if (url != previous_url) {
        previous_url = url;
        setTimeout(function() {
            var start_time = +new Date();
            history.replaceState({}, "", url);
            var end_time = +new Date();
        }, 100);
    }
}


function age_group(age) {
    if (age < 2)
    {}
    if (age < 7)
        return "2";
    if (age < 13)
        return "7";
    return "13";
}

function duration_group(duration) {
    if (duration < 5)
    {}
    if (duration < 10)
        return "5";
    if (duration < 30)
        return "20";
    if (duration < 45)
    {}
    return "60";
}

function participants_group(participants) {
    if (participants < 9)
        return "5";
    if (participants < 20)
        return "10"
    if (participants < 30)
    {}
    return "30";
}


function magic(text) {
    if (text.search(/^profile[r]?[ :]+on/) != -1) {
        console.log("profiler enabled");
        $("#profiler").show();
    }
    if (text.search(/^profile[r]?[ :]+off/) != -1) {
        console.log("profiler disabled");
        $("#profiler").hide();
    }
}
