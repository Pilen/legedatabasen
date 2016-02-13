
var categories = [{name:"Alle", entries:[]},
                  {name:"Tonselege", entries:[]},
                  {name:"Boldlege", entries:[]},
                  {name:"Fangelege", entries:[]},
                  {name:"Gemmelege", entries:[]},
                  {name:"Sanselege", entries:[]}];

var category_swiper;
var unknown_categories = [];
var lege_map = {};
var current_category;
var current_search;

function prepare_categories() {
    var category_map = {};
    categories.map(function(category) {
        var name = category
            .name
            .toLowerCase()
            .replace(/lege?/g, "");
        category_map[name] = category;
    });
    lege.map(function(leg) {
        category_map["alle"].entries.push(leg);
        leg.tags.map(function(tag) {
            tag = tag.toLowerCase().replace(/lege?/g, "");
            if (!category_map[tag]) {
                unknown_categories.push(tag);
            } else {
                category_map[tag].entries.push(leg);
            }
        });
        lege_map[leg.url] = leg;
    });
    console.log(unknown_categories.length + " unknown categories in `unknown_categories'");
}

function insert_buttons(lege) {
    $("#lege").append(lege.map(function(leg) {
        leg.node = $('<li role="presentation"><a href="#'+leg.url+'">'+leg.name+' <span class="score">0</span></a></li>');
        return leg.node;
    }));
}

function show_leg() {
    var url = window.location.hash.slice(1);
    if (url === "") {
        $(".modal").modal("hide");
    } else {
        leg = lege_map[url];
        console.log(leg);
        $("#modal-title").text(leg.name);
        $(".modal-body").html(leg.description);
        $(".modal").modal("show");
    }
}

function filter() {
    console.log(".");
    $("#lege").children().hide();

    // $("#lege").children().fadeOut(0, function() {
    var lege = current_category.entries.filter(function(leg) {
        leg.score = 0;
        if (current_search) {
            if (leg.name.indexOf(current_search) != -1) {
                leg.score += 1000
            }
            leg.tags.map(function(tag) {
                if (tag.indexOf(current_search) != -1) {
                    leg.score += 100;
                }
            });
            if (leg.description.indexOf(current_search) != -1) {
                leg.score += 1;
            }
            return leg.score > 0;
        } else {
            return true;
        }
    });
    lege.sort(function(a, b) {
        var value = b.score - a.score; // Sort decending
        return value || a.name.localeCompare(b.name);
    });
    // l = lege;

    // $("#lege").empty();
    // insert_buttons(lege);
    // });

    $("#lege").children().detach();
    $("#lege").append(lege.map(function(leg) {
        leg.node.find(".score").text(leg.score);
        leg.node.show();
        return leg.node;
    }));
}


function swipe(swiper) {
    var index = parseInt(swiper.slides[swiper.activeIndex].getAttribute("data-swiper-slide-index"));
    var lege = categories[index].entries;
    current_category = categories[index];
    filter();

}

function search_update(event) {
    var search_text = $("#search-box")[0].value;
    current_search = search_text;
    filter();
}

function clear_search() {
    $("#search-box")[0].value = "";
    current_search = "";
    filter();
}

function init() {
    prepare_categories();

    var slides = categories.map(function(category) {
        return ('<div class="swiper-slide">' +
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
    current_category = categories[0];
    insert_buttons(lege);
    show_leg();
    console.log("Ready");
}
$(window).on("hashchange", show_leg);

$(document).ready(init);
