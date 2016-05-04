
var categories = [{name:"Alle",      term:"",      entries:[]},
                  {name:"Tonselege", term:"tons",  entries:[]},
                  {name:"Boldlege",  term:"bold",  entries:[]},
                  {name:"Fangelege", term:"fange", entries:[]},
                  {name:"Gemmelege", term:"gemme", entries:[]},
                  {name:"Sanselege", term:"sanse", entries:[]}];

var category_swiper;
// var unknown_categories = [];
var lege_map = {};
var current_category;
var current_search;
var search;

function prepare_categories() {
    lege.map(function(leg) {
        lege_map[leg.url] = leg;
        leg.tags = leg.tags.toLowerCase();
        categories.map(function(category) {
            if (leg.tags.indexOf(category.term) >= 0) {
                // console.log("fisk");
                category.entries.push(leg);
            }
        }, this);
    }, this);
    // var category_map = {};
    // categories.map(function(category) {
    //     var name = category
    //         .name
    //         .toLowerCase()
    //         .replace(/lege?/g, "");
    //     category_map[name] = category;
    // });
    // lege.map(function(leg) {
    //     category_map["alle"].entries.push(leg);
    //     leg.tags.map(function(tag) {
    //         tag = tag.toLowerCase().replace(/lege?/g, "");
    //         if (!category_map[tag]) {
    //             unknown_categories.push(tag);
    //         } else {
    //             category_map[tag].entries.push(leg);
    //         }
    //     });
    //     lege_map[leg.url] = leg;
    // });
    // console.log(unknown_categories.length + " unknown categories in `unknown_categories'");
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
        $("#modal-title").text(leg.name);
        $(".modal-body").html(leg.description);
        $(".modal").modal("show");
    }
}

function filter() {
    console.log(".");
    $("#lege").children().hide();

    // // $("#lege").children().fadeOut(0, function() {
    // var lege = current_category.entries.filter(function(leg) {
    //     leg.score = 0;
    //     if (current_search) {
    //         if (leg.name.toLowerCase().indexOf(current_search) != -1) {
    //             leg.score += 1000
    //         }
    //         leg.tags.map(function(tag) {
    //             if (tag.toLowerCase().indexOf(current_search) != -1) {
    //                 leg.score += 100;
    //             }
    //         });
    //         if (leg.description.toLowerCase().indexOf(current_search) != -1) {
    //             leg.score += 1;
    //         }
    //         return leg.score > 0;
    //     } else {
    //         return true;
    //     }
    // });
    // lege.sort(function(a, b) {
    //     var value = b.score - a.score; // Sort decending
    //     return value || a.name.localeCompare(b.name);
    // });
    // // l = lege;

    // // $("#lege").empty();
    // // insert_buttons(lege);
    // // });

    var found = search.search(current_search, current_category.entries);
    var lege = found.map(function(item) {
        item.document.score = item.score;
        return item.document;
    });

    lege.sort(function(a, b) {
        var value = b.score - a.score; // Sort decending
        return value || a.name.localeCompare(b.name);
    });
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
    current_search = search_text.toLowerCase();
    filter();
}

function clear_search() {
    $("#search-box")[0].value = "";
    current_search = "";
    filter();
}

function init() {
    prepare_categories();

    search = new SearchIndex({overlap_power: 1,
                              length_power: 1,
                              word_weight: 1.0,
                              // prefix_weight: 0.9,
                              // substring_weight: 0.8})
                             })

        .add_field("description")
        .add_field("name", 10)
        .add_field("tags", 9)
        .add_field(auto_tags, 1)
        .id("url")
        .add(lege)
        .compile();

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


function Interval_matcher(suffix) {
    var regex_text = "(\\d*)" + "\\s*(?:"+suffix+")?" + "(?:\\s*(?:-|til)\\s*(\\d*))?" + "\\s*" + "(?:"+suffix+")" + "(?:\\s|$)";
    this.regex = new RegExp(regex_text);
    this.match = function(text) {
        var m = this.regex.exec(text);
        if (m) {
            var min = m[1];
            var max = m[2] || m[1];
            return [parseInt(min), parseInt(max)];
        } else {
            return null;
        }
    };
}



function id(x){return x;};
s = new SearchIndex()
    .add_field(id)
    .id(id)
    .add("abc")
    .add("abb")
    .add("abekat")
    .add("ablele")
    .add("abe")
    .add("abc abb abekat ablele abe")
    .add("væbner")
    .add("senior")
    .add("seniorvæbner")
    .add("boldspil")
    .add("fodboldspiller")
    .add("fodspil")
    .compile();

fs = function(t) {
    s.search(t).map(function(x) {
        console.log(x.score + " " + x.document + "\n");
    });
}
fn = function(t) {
    s.plain(t).map(function(x) {
        console.log(x.score + " " + x.document + "\n");
    });
}
function time(f) {
    var start = +new Date();
    var result = f();
    var end = +new Date();
    result.reverse();
    result.map(function(x) {
        console.log(x.score + " " + x.id + "\n");
    });
    console.log("filter duration " + (end-start));
}

// t = make_trie(["abc", "abb", "abekat", "abelle"]);

// s = new SearchIndex()
//     .add_field(id, 1)
//     .id(id)
//     .add([lege.map(function(x){return x.description;}).join(" ")])
//     .compile();



function age_groupings(min, max) {
    var all_classes = [
        "Tantebarn",    // 0
        "Tantebarn",    // 1
        "Tantebarn",    // 2
        "Numling",      // 3
        "Numling",      // 4
        "Pusling",      // 5
        "Pusling",      // 6
        "Tumling",      // 7
        "Tumling",      // 8
        "Pilt",         // 9
        "Pilt",         // 10
        "Væbner",       // 11
        "Væbner",       // 12
        "Seniorvæbner", // 13
        "Seniorvæbner", // 14
        "Senior",       // 15
        "Senior",       // 16
        "Senior",       // 17
        "Senior",       // 18
        "Leder",        // 19
        "Leder"];       // 20

    var selected = [];
    var previous = null;
    for (var i = min; i <= max && i < all_classes.length; i++) {
        if (previous != all_classes[i]) {
            previous = all_classes[i];
            selected.push(previous);
        }
    }
    return selected;
}

function auto_tags(document) {
    var result = age_groupings(document.min_age, document.max_age).join(" ");
    return result;
}
