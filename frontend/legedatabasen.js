console.log("START");
var $=$;

var categories = [
    {name: "Sanselege"},
    {name: "Gemmelege"},
    {name: "Fangelege"},
    {name: "Boldlege"},
    {name: "Tonselege"},
    {name: "Top lege"},
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
    categories.map(function(category, key) {
        category.url = category.url || category.name.toLocaleLowerCase().replace(" ", "_");
        category.image = category.image || category.name.replace(" ", "") + ".svg";
        var item = $('<div class="category outlined" id="'+key+'" ' +
                     'style="background-image: url(images/categories/'+category.image+');">' +
                     category.name +
                     '</div>');
        item.appendTo('.slider-nav');
    });

    $('.slider-nav').slick({
        slide: 'div',
        infinite: true,
        slidesToShow: 7,
        slidesToScroll: 1,
        dots: true,
        centerMode: true,
        initialSlide: category,
        variableWidth: true,
        switeToSlide: true,
        arrows: false,
        responsive: [{breakpoint: 1240,
                      settings: {slidesToShow: 5}},
                     {breakpoint: 900,
                      settings: {slidesToShow: 3}},
                     {breakpoint: 600,
                      settings: {slidesToShow: 1}}]
    });

    // $('.slider-nav').on('beforeChange', function(event, slick, currentSlide, nextSlide){
    // $('.slider-nav').on('swipe', function(event, slick, direction){
    $('.slider-nav').on('afterChange', function(event, slick, currentSlide, nextSlide){
        // $('.slider-nav').on('swipe', function(event, slick, currentSlide, nextSlide){
        nextSlide = currentSlide;
        // var nextSlide = slick.currentSlide;
        if(category != nextSlide){
            category = nextSlide;
            // history.replaceState({}, '', categories[category].url);
            showCategory(categories[nextSlide]);
        }
        return false;
    });

    $.getJSON("data.json", function (data) {
        data = data.filter(function(d) {return d.name;}); // Currently
        lege = data.map(function(leg, key) {
            lege_map[leg.url] = leg;
            leg.node = $(
                '<a href="leg/'+leg.url+'" class="element-item '+leg.tags+'" data-category="'+leg.inde+'" score=0 title="'+leg.name+'">'+
                    '<div class="leg" style="background-image:url(images/1.png);">'+
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
                    '</a>');
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
                var categories = leg.game_categories.map(function(c){return c.name}).join(",");
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
            updateDisplayState();
            been_at_front = true;
            return false;
        });

        $(window).on('popstate', function() {
            updateDisplayState();
        });

        updateDisplayState();
    });

    $(window).scroll(function() {
        var state = "lege";
        var position = $(this).scrollTop();
        if(state == "lege" && position >= 120) {
            $(".navbar-brand").text(categories[category].name);
        } else if(state == "leg" && position >= 50) {
            $(".navbar-brand").text(leg.name);
        } else {
            $(".navbar-brand").text("Legedatabasen");
        }
    });

    $("#leg_back").click(function(){
        if (been_at_front) {
            window.history.back();
        } else {
            history.pushState({}, "", "/");
        }
    });


    function updateDisplayState() {
        var url = window.location.pathname;
        url = url.replace(/^\/|\/$/g, ""); // Trim off slashes at the start + end
        url = url.replace("lege3/", "");
        var url_parts = url.split("/");

        if (url_parts[1] == "leg") {
            var leg = lege_map[url_parts[2]];
            showLeg(leg);
        } else if (url_parts.length == 2 && url_parts[1]) {
            var cats = categories.filter(function(category) {
                return category.url == url_parts[1];
            });
            console.log("cats: ", cats);
            showCategory(category[0]);
        } else if (!url_parts[1]) {
            showBase();
        } else {
            // Error
        }
        return "Not done";

    }

    function showLeg(leg) {
        console.log(leg);
        _=leg;
        $("#lege").hide();
        $("#filter_knap").hide();
        $("#soeg_knap").hide();
        $("#leg").show();

        $("#leg_back").show();
        $("#leg_navn").text(leg.name);
        $("#leg_teaser").text(leg.teaser);
        $("#leg_beskrivelse").text(leg.description);
    }

    function showCategory(category) {
        search.update_filter("category", category.name);

        $("#lege").show();
        $("#filter_knap").show();
        $("#soeg_knap").show();
        $("#leg").hide();
        $("#leg_back").hide();
    }

    function showBase() {
        $("#lege").show();
        $("#filter_knap").show();
        $("#soeg_knap").show();
        $("#leg").hide();
        $("#leg_back").hide();
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


function find_cat(leg) {
    return leg.game_categories.map(function(c) {return c.name;}).join(", ");
}
