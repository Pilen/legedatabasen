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
    category_swiper.on("touchStart", function(swiper) {
        search.abort();
    });
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
            leg.game_area = leg.area.length > 0 ? leg.area[0].area : "INGEN STEDER!";
            leg.age = age_group(leg.min_age);
            leg.duration = duration_group(leg.min_time);
            leg.participants = participants_group(leg.min_participants);
            leg.game_categories = leg.game_categories.filter(function(c) {return c.name.toLocaleLowerCase().indexOf("alle lege") == -1;});
            lege_urls[leg.url] = leg;

            if (leg.images.length > 0) {
                var image = '/images/entries/' + leg.images[0]['list'];
                var classes = "";
            } else {
                var image = "/images/lege/" + leg.game_categories[0].name + "-default.png";
                var classes = "default";
            }

            leg.node = $(
                ('<a href="leg/'+leg.url+'" class="element-item '+leg.tags+'" data-category="'+leg.inde+'" score=0 title="'+leg.name+'">'+
                 '<div class="leg '+ classes +'">'+
                 '<img src="' + image + '" class="leg-box-image">' +
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

        search = new SearchIndex()
            .method("plain")
            .delay(1000)
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
            .callback(sort_lege)
            .compile();
        $("#search").on("input", search_update);
        function search_update(event) {
            var search_text = $("#search")[0].value;
            search_text = search_text.toLowerCase();
            magic(search_text);
            search.query(search_text);
        }

        $('a').click(function(event){
            event.preventDefault();
            history.pushState({}, '', $(this).attr("href"));
            route();
            been_at_front = true;
            return false;
        });

        $(window).on('popstate', function() {
            route();
        });

        route();
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
    })

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

    $("#swipe_knap").click(function() {
        showCategory(categories[category]);
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

    $(window).scroll(function() {
        var state = "lege";
        var position = $(this).scrollTop();
        if(state == "lege" && position >= 120) {
            $("#title").text(categories[category].name);
        } else if(state == "leg" && position >= 50) {
            $("#title").text(leg.name);
        } else {
            $("#title").text("");
        }
    });

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
        $("#modal-leg .modal-body .leg-description").html(description);
        /*
          $("#modal-title").text(leg.name);
          $(".modal-body").html(description);
        */
        $("#modal-leg").modal("show");
        ga('send',
            {
                hitType: 'event',
                eventCategory: 'Leg',
                eventAction: 'show',
                eventLabel: 'Vis leg',
                eventValue: leg.name
            }
        );

    }

    function showCategory(category, noReset) {
        // rename_url(category.url);
        if (noReset) {
            search.update_filter("category", category.name);
        } else {
            resetDisplay().done(function(){
                search.update_filter("category", category.name);
                $("#filters").slideUp(400, function() {
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
                $("#filters").slideUp(400);
            // });
        });
    }
    function showFilter() {
        rename_url("");
        resetDisplay().done(function() {
            $(".swiper-container").slideUp(200, function() {
                $("#filters").slideDown(400);
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

        $("#leg").hide();
        $("#container").show();
        $("#filter_knap").show();
        $("#soeg_knap").show();
        $("#swipe_knap").show();
        $(".navbar .leg_back").hide();
        return $.when(promise1, promise2, promise3);
    }

    function sort_lege(rankings) {
        _r=rankings;
        lege.map(function(leg){
            leg.score = -1;
            leg.node.attr("score", -1);
            // leg.node.find(".score").text(-1);
        });
        rankings.map(function(ranked) {
            // ranked.document.score = ranked.score;
            ranked.document.score = 0;
            ranked.document.node.attr("score", ranked.score);
            // ranked.document.node.find(".score").text(ranked.score);
        });
        $("#profiler").text("sorting");
        var start_time = +new Date();

        // $("#lege").fadeOut(200);
        $("#lege").empty();
        var shown = lege.filter(function(leg) {return leg.score >= 0;});
        shown.sort(function(a, b) {
            if (a.score == b.score) {
                return a.name.localeCompare(b.name);
            }
            return a.score - b.score;
        });
        _s = shown;
        var nodes = shown.map(function(leg) {
            return leg.node;
        }, this);
        $("#lege").append(nodes);

        // $("#lege").fadeIn(200);

        // $("#lege").isotope("updateSortData").isotope();
        var end_time = +new Date();
        $("#profiler").text("isotope: "+(end_time - start_time) +" total: " + (end_time - total_time));

        return;
    }
};
$(document).ready(init);

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
    return "30+";
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
