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

function init() {
    // Create categories
    categories.map(function(category, key) {
        category.url = (typeof category.url !== "undefined") ? category.url : category.name.toLocaleLowerCase().replace(" ", "_");
        category.image = category.image || category.name.replace(" ", "") + ".svg";
        var node = $('<div class="category outlined" id="'+key+'" ' +
                     'style="background-image: url(images/categories/'+category.image+');">' +
                     category.name +
                     '</div>');
        node.appendTo('#slider');

        var node = $('<div class="swiper-slide category outlined" id="'+key+'" ' +
                     'style="background-image: url(images/categories/'+category.image+');">' +
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
    category_swiper.on("slideChangeEnd", function(swiper) {
        var selected = swiper.realIndex;
        if (selected != category) {
            console.log(categories[selected]);
            showCategory(categories[selected]);
        }
    });

    $('#slider').slick({
        slide: 'div',
        infinite: true,
        slidesToShow: 7,
        slidesToScroll: 1,
        dots: true,
        centerMode: true,
        initialSlide: category,
        focusOnSelect: true,
        variableWidth: true,
        swipeToSlide: true,
        arrows: false,
        // touchThreshold: 10,
        responsive: [{breakpoint: 1240,
                      settings: {slidesToShow: 5}},
                     {breakpoint: 900,
                      settings: {slidesToShow: 3}},
                     {breakpoint: 600,
                      settings: {slidesToShow: 1}}]
    });

    $('#slider').on('beforeChange', function(event, slick, currentSlide, nextSlide){
        // $('#slider').on('swipe', function(event, slick, direction){
        // $('#slider').on('swipe', function(event, slick, currentSlide, nextSlide){
        // $('#slider').on('afterChange', function(event, slick, currentSlide, nextSlide){
        nextSlide = currentSlide;
        // var nextSlide = slick.currentSlide;
        if(category != nextSlide){
            category = nextSlide;
            console.log(categories[nextSlide]);
            showCategory(categories[nextSlide]);
        }
        return false;
    });

    // Load lege
    $.getJSON("data.json", function (data) {
        data = data.filter(function(d) {return d.name;}); // There is an empty leg with no name
        lege = data.map(function(leg, key) {
            leg.area = "plæne";
            leg.age = age_group(leg.min_age);
            leg.duration = duration_group(leg.min_time);
            leg.participants = participants_group(leg.min_participants);
            lege_urls[leg.url] = leg;
            if (leg.images.length > 0) {
                var image = leg.images[0] + '?w=360';
            } else {
                var image = '/images/lege/' + Math.floor(Math.random() * 7 + 1) + '.png';
            }
            leg.node = $(
                ('<a href="leg/'+leg.url+'" class="element-item '+leg.tags+'" data-category="'+leg.inde+'" score=0 title="'+leg.name+'">'+
                 '<div class="leg" style="background-image:url(' + image +');">'+
                 '<p class="navn outlined">'+leg.name+'</p>'+
                 (leg.videos.length > 0 ? '<p class="pull-right outlined fdficon" style="font-size:20pt;font-weight:400;padding:10px;">&#xf407;</p>' : '')+
                 '<div class="infobar">'+
                 '<table style="width:100%;">'+
                 '<tbody>'+
                 '<tr>'+
                 '<td style="width:10%"><span class="fdficon" style="font-size:25pt;">&#xf405;</span></td><td style="width:15%">' + leg.participants + '</td>'+
                 '<td style="width:10%"><span class="fdficon" style="font-size:25pt;">&#xf3ba;</span></td><td style="width:15%">' + leg.duration + '<br>min</td>'+
                 '<td style="width:10%"><span class="fdficon" style="font-size:25pt;">&#xf41e;</span></td><td style="width:15%">' + leg.age + '+</td>'+
                 '<td style="width:10%"><span class="fdficon" style="font-size:25pt;">&#xf360;</span></td><td style="width:15%">' + leg.area + '</td>'+
                 '</tr>'+
                 '</tbody>'+
                 '</table>'+
                 '</div>'+
                 '</div>'+
                 '</a>'));
            leg.node.appendTo('#isotope');
            return leg;
        });

        search = new SearchIndex()
            .method("plain")
            .delay(50)
            .add_field("description")
            .add_field("name", 10)
        // .add_field("tags", 9)
        // .add_field(auto_tags, 1)
            .id("url")
            .add(lege)
            .create_filter("category", function(leg, arg) {
                // Only keep lege where the category is found in the tags
                // return leg.tags.toLowerCase().indexOf(arg) != -1;
                console.log(leg, arg);
                if (arg == "Alle lege") {
                    return true;
                }
                var categories = leg.game_categories.map(function(c){return c.name;}).join(",");
                return categories.indexOf(arg) != -1;
            }, function(arg) {return arg || "";})
            .callback(sort_lege)
            .compile();


        // $('#isotope').isotope({
        //     itemSelector: '.element-item',
        //     layoutMode: 'masonry'
        // });
        $("#isotope").isotope({
            itemSelector: '.element-item',
            layoutMode: 'masonry',
            // itemSelector: ".leg",
            // layoutMode: "fitRows",
            sortBy: ["score", "title"],
            sortAscending: {score: false,
                            title: true},
            getSortData: {score:"[score]",
                          title: "[title]"},
            filter: function() {
                var score = parseInt($(this).attr("score"));
                return score >= 0;
            }
        });

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

    $(".leg_back").on("click", function(){
        if (been_at_front) {
            window.history.back();
        } else {
            history.pushState({}, "", "/");
        }
    });

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
            showLeg(leg);
            return;
        }
        // Show category
        if (url) {
            var cats = categories.filter(function(category) {
                return category.url == url;
            });
            $("#slider").slick('slickGoTo', kategori, true);
            showCategory(cats[0]);
            return;
        }
        // Show front (with previous category)
        if (!url) {
            showCategory(categories[category]);
            return;
        }
        // Error
        return;
    }

    $("#swipe_knap").click(function() {
        showCategory(categories[category]);
    });
    $("#filter_knap").click(function() {
        showFilter();
    });
    $("#soeg_knap").click(function() {
        showSearch();
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

    function showLeg(leg) {
        _=leg;
        /*
          $("#lege").hide();
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

        $("#modal-leg #modal-title").html(leg.name);
        if (leg.images.length > 0) {
            $("#modal-leg #leg-presentation-image").remove();
            $("#modal-leg #modal-title").before('<img src="' + leg.images[0] + '?w=800" class="img-responsive" id="leg-presentation-image" />');
        }
        $("#modal-leg .modal-body .leg-teaser").html('<strong>' + leg.teaser + '</strong>');
        $("#modal-leg .modal-body .leg-description").html(description);
        /*
          $("#modal-title").text(leg.name);
          $(".modal-body").html(description);
        */
        $("#modal-leg").modal("show");
    }

    function showCategory(category) {
        // rename_url(category.url);
        resetDisplay().done(function(){
            search.update_filter("category", category.name);
            $("#filters").slideUp(400, function() {
                $("#slider").slideDown(400);
            });
        });
    }

    function showSearch() {
        rename_url("");
        resetDisplay().done(function() {
            $("#title").fadeOut(200, function() {
                $("#search").val("").fadeIn(200);
                $("#slider").slideUp(400);
                $("#filters").slideUp(400);
            });
        });
    }
    function showFilter() {
        rename_url("");
        resetDisplay().done(function() {
            $("#slider").slideUp(200, function() {
                $("#filters").slideDown(400);
            });
        });
    }

    function resetDisplay() {
        var start_time = +new Date();
        var promise1 = scrollToTop(400);
        $(window).scrollTop(0);
        $("#title").text("");
        var promise2 = $("#search:visible").slideUp(200, function() {
            $("#title").fadeIn(200);
        }).promise();;

        $("#leg").hide();
        $("#lege").show();
        $("#filter_knap").show();
        $("#soeg_knap").show();
        $("#swipe_knap").show();
        $(".navbar .leg_back").hide();
        return $.when(promise1, promise2);
    }

    function sort_lege(rankings) {
        lege.map(function(leg){
            leg.node.attr("score", -1);
            // leg.node.find(".score").text(-1);
        });
        rankings.map(function(ranked) {
            ranked.document.node.attr("score", ranked.score);
            // ranked.document.node.find(".score").text(ranked.score);
        });
        $("#isotope").isotope("updateSortData").isotope();
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
        console.log("ERROR");
    if (age < 7)
        return "2";
    if (age < 13)
        return "7";
    return "13";
}

function duration_group(duration) {
    if (duration < 5)
        console.log("ERROR");
    if (duration < 10)
        return "5";
    if (duration < 30)
        return "20";
    if (duration < 45)
        console.log("ERROR");
    return "60";
}

function participants_group(participants) {
    if (participants < 9)
        return "5";
    if (participants < 20)
        return "10"
    if (participants < 30)
        console.log("ERROR");
    return "30+";
}
