
var categories = [{name:"Alle", entries:[]},
                  {name:"Tonselege", entries:[]},
                  {name:"Boldlege", entries:[]},
                  {name:"Fangelege", entries:[]},
                  {name:"Gemmelege", entries:[]},
                  {name:"Sanselege", entries:[]}];

var category_swiper;
var unknown_categories = [];
var lege_map = {};
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
        leg.tags.map(function(tag) {
            tag = tag.toLowerCase().replace(/lege?/g, "");
            category_map["alle"].entries.push(leg);
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

function insert_buttons() {

    $("#lege").append(lege.map(function(leg) {
        return '<li role="presentation"><a href="#'+leg.url+'">'+leg.name+'</a></li>';
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


    $(".modal").on("hidden.bs.modal", function() {
        window.location.hash = "";
    });
    insert_buttons();
    show_leg();
    console.log("Ready");
}
$(window).on("hashchange", show_leg);

$(document).ready(init);
