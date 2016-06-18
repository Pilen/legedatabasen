
var categories = [{name:"Alle",      term:""},
                  {name:"Tonselege", term:"tons"},
                  {name:"Boldlege",  term:"bold"},
                  {name:"Fangelege", term:"fange"},
                  {name:"Gemmelege", term:"gemme"},
                  {name:"Sanselege", term:"sanse"}];
var category_swiper;

var start_time;
var lege_map = {};
var search;



function insert_lege() {
    $("#lege").append(lege.map(function(leg) {
        leg.node = $('<div class="leg" score=0><a class="title" href="#'+leg.url+'">'+leg.name+' <span class="score">0</span></a></div>');
        return leg.node;
    }));
}

function sort_lege(rankings) {
    console.log(".");
    lege.map(function(leg){
        leg.node.attr("score", -1);
        leg.node.find(".score").text(-1);
    });
    rankings.map(function(ranked) {
        ranked.document.node.attr("score", ranked.score);
        ranked.document.node.find(".score").text(ranked.score);
    });
    $("#lege").isotope("updateSortData").isotope();
    return;
}

function show_leg() {
    var url = window.location.hash.slice(1);
    if (url === "") {
        $(".modal").modal("hide");
    } else {
        var leg = lege_map[url];
        $("#modal-title").text(leg.name);
        $(".modal-body").html(leg.description);
        $(".modal").modal("show");
    }
}


function swipe(swiper) {
    var category = swiper.slides[swiper.activeIndex].getAttribute("category");
    search.update_filter("category", category);
}


function search_update(event) {
    start_time = +new Date();
    var search_text = $("#search-box")[0].value;
    search_text = search_text.toLowerCase();
    search.query(search_text);
}

function clear_search() {
    $("#search-box")[0].value = "";
    search.query("");
}


function init() {
    lege.map(function(leg) {
        lege_map[leg.url] = leg;
    });

    search = new SearchIndex()
        .method("plain")
        .delay(50)
        .add_field("description")
        .add_field("name", 10)
        .add_field("tags", 9)
        // .add_field(auto_tags, 1)
        .id("url")
        .add(lege)
        .create_filter("category", function(document, arg) {
            // Only keep lege where the category is found in the tags
            return document.tags.toLowerCase().indexOf(arg) != -1;
        }, function(arg) {return arg || "";})
        .callback(sort_lege)
        .compile();

    var slides = categories.map(function(category) {
        return ('<div class="swiper-slide" category="'+category.term+'">' +
                '<img src="img/categories/'+category.name.toLowerCase()+'.png" alt="'+category.name+'">' +
                '</div>');
    });
    $(".swiper-wrapper").append(slides); // Swiper.appendSlide does not preserve order from categories

    category_swiper = new Swiper(".swiper-container", {
        loop: true,
        centeredSlides: true,
        slidesPerView: "3",
        // loopedSlides: 2,
        prevButton: ".swiper-button-prev",
        nextButton: ".swiper-button-next",
        pagination: ".swiper-pagination",
        paginationClickable: true,
        grabCursor: true,
        keyboardControl: true
    });
    category_swiper.on("slideChangeEnd", swipe);

    $(".modal").on("hidden.bs.modal", function() {
        window.location.hash = "";
    });
    $("#search-box").on("input", search_update);
    $("#clear-search").on("click", clear_search);

    insert_lege();
    $("#lege").isotope({
        itemSelector: ".leg",
        layoutMode: "fitRows",
        sortBy: ["score", "title"],
        sortAscending: {score: false,
                        title: true},
        getSortData: {score:"[score]",
                      title: "title"},
        filter: function() {
            var score = parseInt($(this).attr("score"));
            return score >= 0;
        }
    });

    show_leg();
    console.log("Ready");
}

$(window).on("hashchange", show_leg);

$(document).ready(init);
