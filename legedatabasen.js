
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
var search;

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

    var lege = search.search(current_search, current_category.entries).map(function(item) {
        item.document.score = item.score;
        return item.document;
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

    search = new SearchIndex()
        .add_field("description")
        .add_field("name", 10)
        .id_function("url")
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


function SearchIndex() {
    this._documents = [];
    this._items = {};
    this._fields = [];
    this._get_id = function(document) {return document.id;};
    this._compiled = false;



    this.add_field = function(field, weight) {
        if (this._compiled) {throw Error("SearchIndex already this._compiled");}
        if (typeof(weight) === "undefined") {
            weight = 1.0;
        }

        var get = field;
        if (typeof get !== "function") {
            get = function(document) {return document[field];};
        }
        this._fields.push({get:get, weight:weight});
        return this;
    };
    this.add = function(documents) {
        if (this._compiled) {throw Error("SearchIndex already this._compiled");}
        if (documents instanceof Array) {
            this._documents = this._documents.concat(documents);
        } else {
            this._documents.push(documents);
        }
        return this;
    };
    this.id_function = function(id) {
        if (this._compiled) {throw Error("SearchIndex already this._compiled");}
        if (typeof id === "function") {
            this._get_id = id;
        } else {
            this._get_id = function(document) {return document[id];};
        }
        return this;
    };

    this.compile = function() {
        if (this._compiled) {throw Error("SearchIndex already this._compiled");}
        this._compiled = true;
        this._documents.map(function(document) {
            var tries = this._fields.map(function(field) {
                var data = field.get(document);
                var trie = make_trie(tokenize(data));
                return trie;
            });
            var id = this._get_id(document);
            if (typeof id === "undefined") {throw Error("SearchIndex encountered an undefined id");}
            var item = {document: document, tries: tries};
            this._items[id] = item;
        }, this);
        return this;
    };

    this.search = function(query, documents) {
        if (!this._compiled) {throw Error("SearchIndex not yet this._compiled");}

        if (!documents) {
            documents = this._documents;
        }

        var querys = tokenize(query||"");
        if (!querys || !querys[0]) {
            return documents.map(function(document) {
                var id = this._get_id(document);
                var item = this._items[id]; // This might actually be unneeded
                return {document: item.document,
                        id: id,
                        score: 0};
            }, this);
        };

        var result = documents.map(function(document) {
            var id = this._get_id(document);
            var item = this._items[id];
            var score = 0;
            for (var i = 0; i < this._fields.length; i++) {
                var field_score = 0;
                querys.map(function(q) {
                    var trie = item.tries[i];
                    var node = trie_lookup(trie, q);
                    console.log("\n\n",item.document, node);
                    var percentage = overlap(node.word, q);
                    // percentage = 1;
                    // var percentage = percentage*percentage;
                    var a = percentage * (node.words?1:0);
                    var b = percentage * (node.prefix?1:0) * 0.9;
                    var c = percentage * (node.substring?1:0) * 0.8
                    // field_score += percentage * (node.words?1:0);
                    // field_score += percentage * (node.prefix?0.1:0) * 0.9;// * 0.5;
                    // field_score += percentage * (node.substring?1:0) * 0.8;// * 0.25;
                    field_score += a + b + c;
                    // field_score += percentage;
                    // console.log(node.word+"::   "+"p:"+percentage+" * w:"+node.words+" = "+percentage*node.words+"\t s:"+node.prefix+", ps.:"+percentage*node.prefix);
                    console.log(node.word+"::   "+
                                percentage+"*"+node.words+"w = "+a+"\t "+
                                percentage+"*"+node.prefix+"p = "+b+"\t "+
                                percentage+"*"+node.substring+"s = "+c);
                });
                score += field_score * this._fields[i].weight;
            }
            return {id:id, document:item.document, score: score};
        }, this);

        result.sort(function(a, b) {return b.score - a.score;});
        return result;
    }
}







/*** Parsing data: ***/

var tokenize = function(text) {
    text = text
        .toLowerCase()
        .replace(/[^\wæøåÆØÅ]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .split(" ")
    return text;
};

var make_trie = function(tokens) {
    var trie = {word: "",
                children: {},
                words: 0,
                prefix: 0,
                substring: 0};

    tokens.map(function(token) {
        for (var j = 0; j < token.length; j++) {
            var node = trie;
            for (var i = j; i < token.length; i++) {
                var new_node = node.children[token[i]]
                if (!new_node) {
                    new_node = {word: node.word + token[i],
                                children: {},
                                words: 0,
                                prefix: 0,
                                substring: 0};
                    node.children[token[i]] = new_node;
                }
                if (j == 0) {
                    if (i == (token.length - 1)) {
                        new_node.words+=1;
                    } else {
                        new_node.prefix += (i+1) / token.length;
                    }
                } else {
                    new_node.substring += (i - j + 1) / token.length;
                }
                node = new_node;
            }
        }
    });
    return trie;
}

var trie_lookup = function(trie, token) {
    var node = trie;
    for (var i = 0; i < token.length; i++) {
        var next = node.children[token[i]];
        if (!next) {
            return node;
        }
        node = next;
    }
    return node;
}

var overlap = function(w1, w2) {
    var length1 = w1.length;
    var length2 = w2.length;
    var min = length1 < length2 ? length1 : length2;
    for (var i = 0; i < min; i++) {
        if (w1[i] !== w2[i]) {
            break;
        }
    }
    return (i * 2) / (length1 + length2);
}

// }


function id(x){return x;};
s = new SearchIndex()
    .add_field(id)
    .id_function(id)
    .add("abc")
    .add("abb")
    .add("abekat")
    .add("ablele")
    .add("abe")
    .add("abc abb abekat ablele abe")
    .add("væbner")
    .add("senior")
    .add("seniorvæbner")
    .compile();


// t = make_trie(["abc", "abb", "abekat", "abelle"]);
