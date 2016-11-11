console.log("START");
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
var lege_map = {}; // url -> lege
var state;
var been_at_front = false;
var search;

function init() {
    // Create categories
    categories.map(function(category, key) {
        category.url = (typeof category.url !== "undefined") ? category.url : category.name.toLocaleLowerCase().replace(" ", "_");
        category.image = category.image || category.name.replace(" ", "") + ".svg";
        var node = $('<div class="category outlined" id="'+key+'" ' +
                     'style="background-image: url(images/categories/'+category.image+');">' +
                     category.name +
                     '</div>');
        node.appendTo('.slider-nav');
    });

    // Create category swiper
    $('.slider-nav').slick({
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

    $('.slider-nav').on('beforeChange', function(event, slick, currentSlide, nextSlide){
    // $('.slider-nav').on('swipe', function(event, slick, direction){
    // $('.slider-nav').on('swipe', function(event, slick, currentSlide, nextSlide){
    // $('.slider-nav').on('afterChange', function(event, slick, currentSlide, nextSlide){
        nextSlide = currentSlide;
        // var nextSlide = slick.currentSlide;
        if(category != nextSlide){
            category = nextSlide;
            showCategory(categories[nextSlide]);
        }
        return false;
    });

    // Load lege
    $.getJSON("data.json", function (data) {
        data = data.filter(function(d) {return d.name;}); // There is an empty leg with no name
        lege = data.map(function(leg, key) {
            lege_map[leg.url] = leg;
            var image = Math.floor(Math.random() * 7) + 1;
            leg.node = $(
                ('<a href="leg/'+leg.url+'" class="element-item '+leg.tags+'" data-category="'+leg.inde+'" score=0 title="'+leg.name+'">'+
                 '<div class="leg" style="background-image:url(images/lege/' + image + '.png);">'+
                 '<p class="navn outlined">'+leg.name+'</p>'+
                 '<p class="pull-right outlined fdficon" style="font-size:20pt;font-weight:400;padding:10px;">&#xf407;</p>'+
                 '<div class="orange">'+
                 '<table style="width:100%;">'+
                 '<tbody>'+
                 '<tr>'+
                 '<td style="width:10%"><span class="fdficon" style="font-size:25pt;">&#xf405;</span></td><td style="width:15%">5</td>'+
                 '<td style="width:10%"><span class="fdficon" style="font-size:25pt;">&#xf3ba;</span></td><td style="width:15%">15<br>min</td>'+
                 '<td style="width:10%"><span class="fdficon" style="font-size:25pt;">&#xf41e;</span></td><td style="width:15%">13+</td>'+
                 '<td style="width:10%"><span class="fdficon" style="font-size:25pt;">&#xf360;</span></td><td style="width:15%">Stor</td>'+
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
            $("#title").text('');
        }
    });

    $(".modal").on("hidden.bs.modal", function() {
        // The modal could also be closed by pressing back
        // window.location.hash = "";
        if (been_at_front) {
            window.history.back();
        } else {
            history.pushState({}, "", "/");
        }

    });
    $("#leg_back").click(function(){
        // Same as clicking on the close button
        $(".modal .btn").click();
    });

    function route() {
        var url = window.location.pathname;
        url = url .replace("/lege3", "")
            .replace("/legedatabasen", "")
            .replace("/frontend", "");
        url = url.replace(/^\/|\/$/g, ""); // Trim off slashes at the start + end


        // Show leg
        if (url.startsWith("leg/")) {
            var leg = lege_map[url.substring(4)];
            showLeg(leg);
            return;
        }
        // Show category
        if (url) {
            var cats = categories.filter(function(category) {
                return category.url == url;
            });
            $(".slider-nav").slick('slickGoTo', kategori, true);
            console.log("cats: ", cats);
            showCategory(cats[0]);
            return;
        }
        // Show front (with previous category)
        if (!url) {
            showCategory(categories[category]);
            return;
        }
        // Error
        console.log("404");
        return;
    }

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
        //$("#leg_back").show();

        $("#modal-leg").find("#modal-title").html(leg.name);
        $("#modal-leg").find(".modal-body").find(".leg-teaser").html('<strong>' + leg.teaser + '</strong>');
        $("#modal-leg").find(".modal-body").find(".leg-description").html(leg.description);
        /*
        $("#modal-title").text(leg.name);
        $(".modal-body").html(description);
        */
        $("#modal-leg").modal("show");
    }

    function showCategory(category) {
        // rename_url(category.url);
        console.log("\n\nshow cat");
        resetDisplay().done(function(){
            console.log("reset");
            search.update_filter("category", category.name);
            $("#filters").slideUp(400, function() {
                $(".slider-nav").slideDown(400);
            });
        });
    }

    function showSearch() {
        rename_url("");
        resetDisplay().done(function() {
            $("#title").fadeOut(200, function() {
                $("#search").val("").fadeIn(200);
                $(".slider-nav").slideUp(400);
                $("#filters").slideUp(400);
            });
        });
    }
    function showFilter() {
        rename_url("");
        resetDisplay().done(function() {
            $(".slider-nav").slideUp(200, function() {
                $("#filters").slideDown(400);
            });
        });
    }

    function resetDisplay() {
        var start_time = +new Date();
        var promise1 = scrollToTop(400);
        $(window).scrollTop(0);

        var promise2 = $("#search:visible").slideUp(200, function() {
            $("#title").fadeIn(200);
        }).promise();;

        $("#leg").hide();
        $("#lege").show();
        $("#filter_knap").show();
        $("#soeg_knap").show();
        $("#swipe_knap").show();
        $("#leg_back").hide();
        console.log("reset time: " + ((+new Date()) - start_time));
        return $.when(promise1, promise2);
    }

    function sort_lege(rankings) {
        console.log("sorting");
        lege.map(function(leg){
            leg.node.attr("score", -1);
            // leg.node.find(".score").text(-1);
        });
        rankings.map(function(ranked) {
            ranked.document.node.attr("score", ranked.score);
            // ranked.document.node.find(".score").text(ranked.score);
        });
        console.log("isotope");
        $("#isotope").isotope("updateSortData").isotope();
        console.log("sorted");
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
            console.log(""+url);
            var start_time = +new Date();
            history.replaceState({}, "", url);
            var end_time = +new Date();
            console.log("" + (end_time - start_time));
        }, 100);
    }
}
