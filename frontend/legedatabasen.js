var $=$;

// `category.index` is set to the coresponding index in the list
// `category.selector` should be unique
var categories = [
    {name: "Sanselege",     selector:  5, about: 0, description: "Lege hvor sanserne er i spil.", example: "blindebuk-i-kreds"},
    {name: "Boldlege",      selector:  3, about: 8, description: "Lege der involverer en bold.", example: "stikbold"},
    {name: "Hjernelege",    selector:  7, about: 3, description: "Lege der handler om det der foregår i hovedet, dette inkluderer også navnelege.", example: "grupper-af..."},
    {name: "Tonselege",     selector:  0, about: 6, description: "Lege hvor man kommer fysisk tæt på hinanden.", example: "muffeldyr"},
    {name: "Gemmelege",     selector:  1, about: 1, description: "Lege der handler om at gemme sig.", example: "daaseskjul"},
    {name: "Alle lege",     selector:  2, about: 10, description: "Her kan du finde samtlige lege i legedatabasen", example: ""},
    {name: "Fangelege",     selector:  4, about: 4, description: "Lege hvor det handler om at fange andre.", example: "tagfat"},
    {name: "Bordlege",      selector:  6, about: 2, description: "Lege der foregår ved eller omkring et bord.", example: "hvad-er-det"},
    {name: "Rundkredslege", selector: 10, about: 9, description: "Lege der skal foregå i en rundkreds.", example: "bankeboef"},
    {name: "Sanglege",      selector:  8, about: 5, description: "Lege der involverer sang, musik og råbende ritualer.", example: "ol-kildetunnel"},
    {name: "Banelege",      selector:  9, about: 7, description: "Lege der kræver en specifik bane, stafetter og linjelege.", example: "den-flittige-bi"}
];
var category_map = {};

var stateActions = {};

var category = 5;  // Current category
var lege;          // List of all lege
var lege_urls = {}; // url -> lege
var currentState = null;
var defaultState;
var been_at_front = false;
var search;
var category_swiper;
var total_time;
var menubar_offset;
var player;

var modalClosedFromBack = false;
var ignoreCategorySelectorClick = false;

var group_2 = "pusling|tumling|bæver|bæverflok|familie|famillie|familiespejder|familliespejder|mikro|mikrospejder|mini|minispejder|små";
var group_7 = "pilt|væbner|ulve|ulveflok|junior|juniortrop|mellem|mellemste";
var group_13 = "seniorvæbner|senior|spejder|spejdertrop|seniortrop|rover|roverklan|stor|større|største";
var regex_2 = new RegExp("\\b("+group_2+")[ers]*\\b", "i");
var regex_7 = new RegExp("\\b("+group_7+")[ers]*\\b", "i");
var regex_13 = new RegExp("\\b("+group_13+")[ers]*\\b", "i");
var regex_any = new RegExp("\\b("+group_2+"|"+group_7+"|"+group_13+")[ers]*\\b", "gi");

function debug(string) {
    console.log("debug: " + string);
    debug.tag.text(string);
}
window.onerror = function(msg, url, lineNo, columnNo, error) {
    debug("onerror @"+url+" "+lineNo+":"+columnNo+" "+msg+" ===> "+error);
};

/*******************************************************************************
                                 Initialization
*******************************************************************************/

function main() {
    $.when($.getJSON("/data.json"),
           $.ready)
        .done(init);
}
main();

function init(data) {
    debug.tag = $("#debug");
    debug("init");
    magic(decodeURI(location.search.substring(1)));

    marked.setOptions({breaks: true});

    // // Setup youtube
    // var tag = document.createElement("script");
    // tag.src = "//www.youtube.com/iframe_api";
    // var firstScriptTag = document.getElementsByTagName("script")[0];
    // firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    // console.log("loading youtube");


    // Prepare categories
    categories.map(function(category, key) {
        category.index = key;
        category.url = (typeof category.url !== "undefined") ? category.url : category.name.toLocaleLowerCase().replace(" ", "_");
        category.image = category.image || category.name.replace(" ", "") + ".svg";
        category_map[category.name.toLocaleLowerCase()] = category;
    });

    initSwiper();

    initSelector();

    initTopImageChange();
    initStickyMenubar();

    initMenubar();

    initFilters();

    // Initialize lege
    initLege(data[0]).then(function() {
        $('#elements').on("click", "a.leg", openLeg);
        $(".leg_back").on("click", function(e) {
            $("#modal-leg").modal("hide");
        });

        $('#modal-leg').on('hide.bs.modal', function (e) {
            if (player) {
                player.stopVideo();
                player = null;
            }
            if (modalClosedFromBack) {
                // Second time we get here
                modalClosedFromBack = false;
            } else {
                popState();
            }
            // replaceState(showCategory(category));
            // history.pushState({}, "", "/");
        });

        contactify();

        initSearch();
        initStateActions();

        $(window).on('popstate', onPopState);

        // Setup games/scripts in each leg
        lege_urls["mus"].script = playMus;

        // mus();
        defaultState = showCategory(category);
        route();
        $(".loading-balloon").hide();
        $("#container").show();
        $(".about-balloon").click(function() {
            event.preventDefault();
            pushState(showAbout());
            return false;
        }).show();
        //category_swiper.init();
        setTimeout(function () {category_swiper.init(); }, 1); // TODO: test om man kan bruge ovenstående linje (den er rykket i forhold til tidligere)
        lazy();
        $(window).resize();
        debug("done");
    });
}

function initSwiper() {
    var html = categories.map(function(category) {
        return ('<div class="swiper-slide category" id="'+category.index+'" ' +
                'style="background-image: url(/images/categories/'+category.image+');">' +
                category.name +
                '</div>');
    }).join("\n");
    $(".swiper-wrapper")[0].innerHTML = html;

    category_swiper = new Swiper(".swiper-container", {
        loop: true,
        centeredSlides: true,
        // slidesPerView: 7,
        slidesPerView: "auto",
        // prevButton: ".swiper-button-prev",
        // nextButton: ".swiper-button-next",
        pagination: ".swiper-pagination",
        // paginationClickable: true, //Sadly does not work correctly! https://github.com/Pilen/legedatabasen/issues/124
        paginationClickable: false,
        grabCursor: true,
        keyboardControl: true,
        initialSlide: category
    });
    category_swiper.on("onInit", function(e) {
        debug("category swiper init");
    });
    // category_swiper.on("touchStart", function(swiper) {
    //     search.abort();
    // });
    category_swiper.on("slideChangeStart", function(swiper) {
        console.log("slideChangeStart", swiper);
    });
    category_swiper.on("slideChangeEnd", function(swiper) {
        console.log("slideChangeEnd", swiper);
        total_time = performance.now();
        var selected = Number(swiper.realIndex);
        $("#profiler").text(categories[selected].name);
        if (selected != category) {
            category = selected;
            // showCategory(selected, true /* No reset */);
            replaceState(showCategory(selected));
        }
    });

    // WORKAROUND
    // This is a workaround for swipers pagination not working correctly when
    // paginationClickable is set to true.
    // The slideChangeEnd is not always send.
    // See https://github.com/Pilen/legedatabasen/issues/124
    // This links to an issue in the Swiper repository.
    category_swiper.on("onInit", function(e) {
        $(".swiper-pagination-bullet").map(function(index, element) {
            // Beaware that the arguments for the callback to .map is reversed.
            // So index is first - http://api.jquery.com/map/
            $(element).attr("category", index).css("cursor", "pointer");
        });
        $(".swiper-container").on("click", ".swiper-pagination-bullet", function(event) {
            category_swiper.slideTo(this.getAttribute("category"));
        });
    });
    // END OF WORKAROUND

    $($(".swiper-pagination-bullet")[4]).click();
}

function initSelector() {
    var categories_copy = categories.slice(0);
    categories_copy.sort(function(a, b) {return a.selector - b.selector;});
    var row_1 = categories_copy.slice(0, 5);
    var row_2 = categories_copy.slice(row_1.length);

    function selector(category) {
        return ('<input type="radio" name="category-selector" id="category-selector-' + category.index + '" value="' + category.index + '"/>' +
                '<label for="category-selector-' + category.index + '">' +
                '<div class="category" id="selector-'+category.index+'" ' +
                'style="background-image: url(/images/categories/'+category.image+');">' +
                category.name +
                '</div>' +
               '</label>');
    };
    $("#category-selector").append('<div class="row">' +
                                   row_1.map(selector).join("") +
                                   '</div>' +
                                   '<div class="row">' +
                                   row_2.map(selector).join(""));
    $("#category-selector input").on("click", function(e) {
        debug("category-selector");
        var selected = e.target.value;
        if (ignoreCategorySelectorClick) {
            ignoreCategorySelectorClick = false;
            return;
        }
        if (selected != category) {
            category = selected;
            // showCategory(selected, true /* No reset */);
            replaceState(showCategory(selected));
        }
        // return false;
    });
    // $("#category-selector .category").on("mousedown", function(e) {
    //     $("#category-" + e.target.id).click();
    // });
}

function initFilters() {
    // $('.filter input[type=radio], .filter input[type=radio]+label').click(function() {
    $('.filter input[type=radio]').click(function(e) {
        var radio = this;
        var $filter = $(radio).parent();
        if ($filter.data("current") === radio.id) {
            $filter.data("current", null);
            radio.checked = false;
            search.update_filter(radio.name, undefined);
        } else {
            $filter.data("current", radio.id);
            search.update_filter(radio.name, radio.value);
        }
    });
}

function initLege(data) {
    // Use a deferred/promise to ensure rendering of swiper+pagination is atomic...
    var deferred = $.Deferred();
    function doStuff() {
        data = data.filter(function(d) {return d.name;}); // There is an empty leg with no name
        lege = data.map(function(leg, key) {
            leg.index = key;
            leg.game_area = leg.area.length > 0 ? leg.area[0].area.toLocaleLowerCase() : "INGEN STEDER!";
            leg.age = age_group(leg.min_age);
            leg.duration = duration_group(leg.min_time);
            leg.participants = participants_group(leg.min_participants);
            leg.game_categories = leg.game_categories.filter(function(c) {
                return c.name.toLocaleLowerCase().indexOf("alle lege") == -1;
            }).map(function(c) {
                return category_map[c.name.toLocaleLowerCase()];
            });
            lege_urls[leg.url] = leg;

            if (leg.images.length > 0) {
                var image = '/images/entries/' + leg.images[0]['list'];
            } else {
                if (leg.game_categories.length > 0) {
                    var image = "/images/lege/" + leg.game_categories[0].name + "-default.png";
                } else {
                    var image = "/images/lege/default.png";
                }
            }

            var in_categories = "";
            if (leg.game_categories.length > 0) {
                in_categories = '<img class="modal-category" src="/images/categories/'+leg.game_categories[0].image+'" alt="'+leg.game_categories[0].name+'" />';
            }
            leg.node = $(
                ('<div class="element">'+
                 '<a href="leg/'+leg.url+'" class="leg" data-category="'+leg.inde+'" score=0 title="'+leg.name+'" leg="'+leg.index+'">'+
                 '<img data-src="' + image + '" class="illustration lazy" src="">' +
                 // (leg.videos.length > 0 ? '<p class="fdficon video-icon">&#xf407;</p>' : '')+
                 (leg.videos.length > 0 ? '<p class="fdficon video-icon">&#xf2a7;</p>' : '')+
                 // (leg.videos.length > 0 ? '<p class="fdficon video-icon">&#xf409;</p>' : '')+
                 '<div class="namebar">'+
                 '<div class="name">'+leg.name+'</div>'+
                 '</div>'+
                 '<div class="iconbar">'+
                 '<table style="width:100%;">'+
                 '<tbody>'+
                 '<tr>'+
                 '<td style="width:5%"><span class="fdficon">&#xf405;</span></td><td style="width:10%">' + leg.participants + '</td>'+
                 '<td style="width:5%"><span class="fdficon">&#xf3ba;</span></td><td style="width:15%">' + leg.duration + ' min</td>'+
                 '<td style="width:5%"><span class="fdficon">&#xf41e;</span></td><td style="width:10%">' + leg.age + '+</td>'+
                 '<td style="width:5%"><span class="fdficon">&#xf360;</span></td><td style="width:15%">' + leg.game_area + '</td>'+
                 '</tr>'+
                 '</tbody>'+
                 '</table>'+
                 '</div>'+
                 '<div class="teaseroverlay">'+
                 '<div class="categories">' + in_categories + '</div>' +
                 '<p>' + (leg.teaser || '') + '</p>' +
                 '</div>'+
                 '</a>'+
                 '</div>'));
            leg.node.appendTo('#lege');
            return leg;
        });
        deferred.resolve(lege);
    }
    doStuff();
    return deferred.promise();
}

function addWindowResizeHook(newFunction) {
    // Will also trigger the hook immediately.
    var oldFunction = window.onresize;
    window.onresize = function() {
        if (typeof oldFunction == "function") {
            oldFunction();
        }
        newFunction();
    };
    newFunction();
}

function initTopImageChange() {
    // There is a problem that if the element is not shown at the start,
    // it has height: 0. To avoid that we reset the height whenever the
    // window is resized.

    function resizeHeight() {
        var first = $("#top-image img:first").addClass("active");
        var height = first.height();
        $("#top-image .filler").height(height);
    };
    addWindowResizeHook(resizeHeight);

    function changeTopImage() {
        var previous = $("#top-image img.previous").removeClass("previous");
        var active = $("#top-image img.active");
        var next = active.next().length > 0 ? active.next() : $("#top-image img:first");
        active.addClass("previous");
        active.removeClass("active");
        next.addClass("active");
    }
    // changeTopImage();
    setInterval(changeTopImage, 1000*6);
}

function initStickyMenubar() {
    function stickyMenubar() {
        var position = $(this).scrollTop();
        if (position >= menubar_offset) {
            $(".menubar").css("position", "fixed");
        } else {
            $(".menubar").css("position", "static");
        }
    }
    addWindowResizeHook(function() {
        menubar_offset = $(".menubar-filler").offset().top;
        stickyMenubar();
    });
    $(window).scroll(function() {
        stickyMenubar();
    });
}

function initMenubar() {
    // $("#swipe_knap").click(function() {
    //     replaceState(showCategory(category));
    // });
    $(".submenu-icon").click(function() {
        if (currentState.type === "filters") {
            replaceState(showCategory(category));
        } else {
            replaceState(showFilters());
        }
    });
    // $("#filter_knap").click(function() {
    //     replaceState(showFilters());
    // });
    $("#search-icon").click(function() {
        replaceState(showSearch());
    });
    $("#search-done-icon").click(function() {
        // TODO: should this be a popState instead?
        replaceState(showCategory(category));
    });

}

function initSearch() {
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
        .create_filter("letter", function(leg, arg) {
            return (arg && leg.name.toLowerCase()[0] == arg) || !arg;
        })
        .create_filter("search", function(leg, arg) {
            if (arg) {
                return arg[leg.age];
            } else {
                return true;
            }
        }, function(arg) {
            var result = {"2": false, "7": false, "13": false};
            var found = false;
            if (regex_2.test(arg)) {
                console.log("2+");
                found = true;
                result["2"] = true;
            }
            if (regex_7.test(arg)) {
                console.log("7+");
                found = true;
                result["7"] = true;
            }
            if (regex_13.test(arg)) {
                console.log("13+");
                found = true;
                result["13"] = true;
            }
            if (found) {
                return result;
            } else {
                return null;
            }
        })
        .callback(sort_lege)
        .compile();

    $("#search").on("input", search_update);
    function search_update(event) {
        var search_text = $("#search")[0].value;
        search_text = search_text.toLowerCase();
        magic(search_text);
        search.update_filter("search", search_text);
        search_text = search_text.replace(regex_any, "");
        if (search_text.length == 1) {
            search.update_filter("letter", search_text);
        } else {
            search.update_filter("letter", null);
            search.query(search_text);
        }
    }
}

/*******************************************************************************
                                      URL
*******************************************************************************/

function showCategory(category) {return {type: "category", url: "/", arg: category};}
function showSearch() {return {type: "search", url: "/", arg: null};}
function showFilters() {return {type: "filters", url: "/", arg: null};}
function showLeg(leg) {return {type: "leg", url: "/leg/"+lege[leg].url, arg: leg, parent: currentState};}
function show404(url) {return {type: "404", url: "/404/"+url, arg: url};}
function showAbout() {return {type: "about", url: "/om-legedatabasen", arg: null,  parent: currentState};}

function pushState(state) {
    history.pushState(state, state.type, state.url);
    showState(state);
}

function replaceState(state) {
    history.replaceState(state, state.type, state.url);
    showState(state);
}

function popState() {
    history.back();
    showState(currentState);
}

function onPopState(event) {
    var state = event.originalEvent.state;
    console.assert(state);
    showState(state, true);
}

function showState(state, back) {
    console.assert(state);
    if (!state) {
        state = defaultState;
    }
    var oldState = currentState;
    currentState = state;
    var action = stateActions[state.type];
    console.assert(action);
    if (!oldState) {
        // No old state to hide
        action.show(state.arg);
    } else if (state.hasOwnProperty("parent")) {
        // Overlay, so dont hide
        action.show(state.arg);
    } else if (oldState.type !== state.type) {
        var oldAction = stateActions[oldState.type];
        if (oldState.hasOwnProperty("parent") && back) {
            // Close overlay, dont show anything new.
            oldAction.hide(oldState.arg);
        } else {
            if (oldState.hasOwnProperty("parent")) {
                // Must be overlay going forward to nonoverlay, so remove them all.
                var oldActions = [];
                while (oldState && oldState.hasOwnProperty("parent")) {
                    var oldAction = stateActions[oldState.type];
                    oldActions.push(oldAction.hide(oldState.arg));
                    oldState = oldState.parent;
                }
                // The chain should always originate in a non overlay state
                console.assert(oldState);
                oldAction = stateActions[oldState.type];
                oldActions.push(oldAction.hide(oldState.arg));
                $.when.apply($, oldActions).then(function() {
                    action.show(state.arg);
                });
            } else {
                oldAction.hide(oldState.arg).then(function() {
                    action.show(state.arg);
                });
            }
        }
    } else {
        action.update(state.arg);
    }
}

function initStateActions() {
    stateActions["category"] = {
        show: function(index) {
            scrollToTop(400);
            $("#selection-container").slideDown(400);
            var category = categories[index];
            if (Number(category_swiper.realIndex) !== category.index) {
                category_swiper.slideTo(category.index);
            }
            ignoreCategorySelectorClick = true;
            $('#category-selector input[value="'+index+'"]').click();
            search.clear();
            search.update_filter("category", category.name);
        },
        update: function(index) {
            scrollToTop(400);
            var category = categories[index];
            if (Number(category_swiper.realIndex) !== category.index) {
                category_swiper.slideTo(category.index);
            }
            ignoreCategorySelectorClick = true;
            $('#category-selector input[value="'+index+'"]').click();
            search.clear();
            search.update_filter("category", category.name);
        },
        hide: function() {
            return $.when(//scrollToTop(400),
                          $("#selection-container").slideUp(400).promise());
        }
    };


    stateActions["search"] = {
        show: function() {
            scrollToTop(400);
            $("#search-icon").fadeOut(200, function() {
                $("#search-done-icon").fadeIn(200);
            });
            $("#search").val("").fadeIn(200*2, function() {
                // $("#search-icon").addClass("active");
            });
            $("#search").focus();
            search.clear();
        },
        update: function() {
        },
        hide: function() {
            $("#search-done-icon").fadeOut(200, function() {
                $("#search-icon").fadeIn(200);
            });
            return $.when(//scrollToTop(400),
                          $("#search").slideUp(200).promise());
            // var deferred = $.Deferred();
            // $("#search").slideUp(200, function() {
            //     $("#title").fadeIn(200, function() {
            //         deferred.resolve();
            //     });
            // });
            // return deferred.promise();
        }
    };


    stateActions["filters"] = {
        show: function() {
            scrollToTop(400);
            $(".submenu-icon").addClass("open");
            $(".filter input[type=radio]").prop("checked", false);
            $(".filter").data("current", null);
            $("#submenu").slideDown(400);
        },
        update: function() {
            $(".filter input[type=radio]").prop("checked", false);
        },
        hide: function() {
            return $.when(//scrollToTop(400),
                $(".submenu-icon").removeClass("open"),
                          $("#submenu").slideUp(400).promise());
        }
    };

    stateActions["leg"] = {
        show: function(index) {
            displayLeg(lege[index]);
        },
        update: function(index) {
            displayLeg(lege[index]);
        },
        hide: function() {
            modalClosedFromBack = true;
            $(".modal").modal("hide");
            var deferred = $.Deferred();
            deferred.resolve();
            return deferred.promise();
        }
    };

    stateActions["404"] = {
        show: function(original_url) {
            $("#modal-leg .modal-body .leg-teaser").html("");
            $("#modal-leg .modal-body .leg-description").html("<h3>404</h3><p>Hmm, det ser ud til at siden du leder efter ikke findes. Vi har sendt Søren ud for at lede</p><p>Du er meget velkommen til at brokke dig til Legeudvalget imens.</p>");
            $("#modal-leg").modal("show");
            ga('send', 'pageview', location.pathname);
        },
        update: function(index) {
        },
        hide: function() {
            return stateActions["leg"].hide();
        }
    };

    stateActions["about"] = {
        show: display_about,
        update: display_about,
        hide: function() {
            modalClosedFromBack = true;
            $(".modal").modal("hide");
            var deferred = $.Deferred();
            deferred.resolve();
            return deferred.promise();
        }
    };
}


function route() {
    var url = window.location.pathname;
    url = url.replace(/^\/|\/$/g, ""); // Trim off slashes at the start + end
    replaceState(defaultState);

    // Show leg
    if (url.startsWith("leg/")) {
        var leg = lege_urls[url.substring(4)];
        if (leg) {
            pushState(showLeg(leg.index));
            return;
        }
    }
    if (url.startsWith("kontakt")) {
        // This is reached because someone opened the /kontakt link in some other fassion
        contact();
        return;
    }
    if (url.startsWith("om-legedatabasen")) {
        pushState(showAbout());
        return;
    }
    if (url === "") {
        // Just show the default state
        return;
    }

    pushState(show404(url));
    return;
}

function openLeg(event){
    event.preventDefault();
    pushState(showLeg(this.getAttribute("leg")));
    return false;
}
/*******************************************************************************

*******************************************************************************/

function displayLeg(leg) {
    console.log("displayLeg");

    var description = marked(leg.description.replace(/^#([^\s])/mg, "# $1"));
    var preparation = marked(leg.preparation.replace(/^#([^\s])/mg, "# $1"));
    var note = marked(leg.note.replace(/^#([^\s])/mg, "# $1"));
    var image = "";
    var video = "";

    if (leg.images.length > 0) {
        image = '/images/entries/' + leg.images[0]['detail'];
    } else {
        image = "/images/lege/" + leg.game_categories[0].name + "-default.png";
    }
    if (leg.videos.length > 0) {
        // video = '<iframe width="100%" height="100%" src="//www.youtube.com/embed/' + leg.videos[0] + '"></iframe';
        // video = '<iframe width="100%" height="100%" src="//www.youtube.com/embed/' + leg.videos[0] + '"></iframe';
        // video = '<iframe width="630" height="390" frameborder="0"src="//www.youtube.com/embed/' + leg.videos[0] + '?enablejsapi=1"></iframe';
        // video = '<iframe width="640" height="390" frameborder="0"src="//www.youtube.com/embed/' + leg.videos[0] + '?enablejsapi=1"></iframe';
        // video = '<iframe src="//www.youtube.com/embed/' + leg.videos[0] + '"></iframe';
        video = '<div id="ytplayer-wrapper"><div id="ytplayer"></div></div>';
        // video = '<div class="ytplayer-wrapper"><div id="ytplayer"></div></div>';
    }

    $("#modal-leg .modal-body .leg-header").html(
        '<figure id="leg-presentation-image">' +
            (video ? video : '<img src="' + image + '" class="img-responsive" id="leg-presentation-image" />') +
            '<figcaption>' +
            '<h3>' + leg.name + '</h3>' +
            '<div class="iconbar">'+
            '<table style="width:100%;">'+
            '<tbody>'+
            '<tr>'+
            '<td style="width:5%"><span class="fdficon">&#xf405;</span></td><td style="width:10%">' + leg.participants + '</td>'+
            '<td style="width:5%"><span class="fdficon">&#xf3ba;</span></td><td style="width:15%">' + leg.duration + ' min</td>'+
            '<td style="width:5%"><span class="fdficon">&#xf41e;</span></td><td style="width:10%">' + leg.age + '+</td>'+
            '<td style="width:5%"><span class="fdficon">&#xf360;</span></td><td style="width:15%">' + leg.game_area + '</td>'+
            '</tr>'+
            '</tbody>'+
            '</table>'+
            '</div>'+
            '</figcaption>' +
            '</figure>');
    $("#modal-leg .modal-body .leg-content").html(
        (('<div class="leg-teaser" style="display:none"><strong>' + leg.teaser + '</strong></div>') +
         ('<div class="leg-description">' +
          '<h3>Beskrivelse:</h3>'+
          description +
          (preparation ? '<h3>Forberedelse:</h3>'+ preparation : '') +
          (note ? '<h3>Noter:</h3>'+ note : '') +
          '</div>')));
    if (leg.game_categories.length > 0) {
        var node = $("#modal-leg .modal-body .leg-description");
        node.append('<h3>Legekategorier:</h3>');
        leg.game_categories.map(function(c) {
            var img = $('<img class="modal-category btn" src="/images/categories/'+c.image+'" alt="'+c.name+'" />');
            node.append(img);
            img.on("click", function(event) {
                pushState(showCategory(c.index));
                // $(".modal").modal("hide");
                // showCategory(c.index);
                // category_swiper.slideTo(c.index);
            });
        });
    }

    //////// Disabled for now ////////
    // var similar = similarLege(leg);
    // if (similar.length > 0) {
    //     var node = $("#modal-leg .modal-body .leg-description");
    //     node.append('<h3>Har du prøvet:</h3>');
    //     similar.map(function(l) {
    //         node.append(l.node.clone());
    //     });
    // }
    //////////////////////////////////

    /*
      $("#modal-title").text(leg.name);
      $(".modal-body").html(description);
    */

    $("#modal-leg").off("shown.bs.modal");
    $("#modal-leg").one("shown.bs.modal", function() {
        console.log("modal shown");
        if (video) {
            var width = Math.ceil($("#ytplayer").width());
            var height = Math.ceil(width / (16 / 9));

            console.log(width, height);
            player = new YT.Player("ytplayer", {
                width: width + "px",
                height: height + "px",
                videoId: leg.videos[0],
                events: {
                    OnError: function(e) {console.log("Youtube error:", e);}
                //     onReady: function(e) {console.log("ready");},
                //     onStateChange: function(e) {console.log("state change");}
                }
            });
            $("#ytplayer-wrapper").height(height + "px"); // Why is this necessary?

            console.log("creating video", leg.videos[0]);
        }
    });

    contactify();
    if (leg.script) {
        leg.script();
    }
    $("#modal-leg").modal("show");

    ga('send', 'pageview', location.pathname);
}

function display_about() {
    var description = marked(
        ('# Velkommen til Legedatabasen.dk' +
         '\n' +
         'Legedatabasen er en inspirationsportal til leg. Men inden du begynder at spørge efter forskellige ideer til legene fingermaling, er det nok godt at vi lige definere lidt hvilken type leg der findes her på siden.\n' +
         'Den leg der findes på legedatabasen er det vi kalder regelstyret, fællesskabende, gruppelege.\n' +
         'Børn, unge og voksne, står alle indimellem i situationer hvor de mangler en aktivitet, en pause, en icebreaker eller bare noget til at få smilet frem imellem sig, og sådan noget har vi masser af her på legedatabasen.\n' +
         '\n' +
         'I topbaren her på siden kan du lave en specifik søgning ved at trykke på søgeknappen.\n' +
         'Hvis du gerne vil filtrere i legene kan dette gøres ved at trykke på filterknappen.\n' +
         '\n' +
         'Under topbaren kan du vælge hvilken legekategori du vil lede i, dette bruges hvis du fx. gerne vil lede efter gemmelege, eller boldlege.\n' +
         '\n' +
         'Når du trykker på en leg popper legen op med sådan en visning som du er kommet frem til her.\n' +
         'I toppen vil du se et billede eller en video af legen.\n' +
         'Under billedet vil legens navn og legens filtre blive vist. Her filtreres legen efter antal deltagere, hvor lang tid legen mindst tager, hvilken alder legen mindst passer til og hvilket størrelse areal legen passer bedst på.\n' +
         '\n' +
         '### Beskrivelse:\n' +
         'Her beskrives legen på en tydelig overskuelig måde.\n' +
         '### Noter:\n' +
         'Her gives der noter til legen hvis der fx. findes nogle mulige udvidelser til legen, eller man skal være særligt opmærksom på noget.\n' +
         ''));
    var end = marked(
        ('## Mere om legedatabasen\n' +
         'Legedatabasen er udviklet af frivillige og det er i kraft af mange menneskers arbejde at legedatabasen kan være en platform hvor man kan finde inspiration til leg. Vi leder altid efter at gøre legedatabasen endnu bedre og den bedste måde at gøre dette på er med hjælp fra hinanden.\n' +
         'Hvis du har nogle tanker, kommentarer eller forslag til forbedringer så er du meget velkommen til at skrive dem til vores [email adresse](/kontakt)\n' +
         '\n' +
         'Hvis du har forslag til nye lege du syntes mangler i legedatabasen så udfyld formularen på dette link:\n' +
         '[Tilføj leg til legedatabasen](https://goo.gl/forms/RFzad0RpxDEAYI6c2)\n' +
         '\n' +
         'Vi glæder os til sammen at gøre legedatabasen endnu bedre.\n' +
         'mvh. FDFs Legeudvalg\n' +
         ''));

    var categories_copy = categories.slice(0);
    categories_copy.sort(function(a, b) {return a.about - b.about;});
    var category_overview = (
        ('<div style="height: 100%; overflow:auto;">' +
         categories_copy.map(function(c) {
             var color = "rgb("+randi(0, 256)+", "+randi(0, 256)+", "+randi(0, 256)+")";
             var color2 = "rgb("+randi(0, 256)+", "+randi(0, 256)+", "+randi(0, 256)+")";
             var color = "";
             var color2 = "";

             var example = "";
             if (c.example) {
                 example = ('<br/>Godt eksempel: &ldquo;' +
                            '<a href="/leg/'+c.example+'" leg="'+lege_urls[c.example].index+'">' +
                            lege_urls[c.example].name +
                            '</a>' +
                            '&rdquo;');
             }
             return (
                 ('<div style="position: relative; float: left; width: 50%; height: 100px; background-color: '+color+'">' +
                  ('<div class="category-about" category="'+c.index+'" style= "float:left; width: 40%; height: 100%; background-color:'+color2+'; background-image: url(/images/categories/'+c.image+');">' +
                   '<div style="position: relative; top: 60%; transform:translateY(-50%); font-size: 16pt">' +
                   c.name +
                   '</div>' +
                   '</div>') +
                  ('<div class="anchor" style="float:right; width: 60%; height: 100%">' +
                   '<div class="vertical-center">'+
                   '<p>'+c.description + example+'</p>'+
                   '</div>' +
                   '</div>') +
                  '</div>'));
         }).join("\n") +
         '</div>'));

    var image = "/images/om-legedatabasen.jpg";
    $("#modal-leg .modal-body .leg-header").html(
        '<figure id="leg-presentation-image">' +
            '<img src="' + image + '" class="img-responsive" id="leg-presentation-image"/>' +
            '<figcaption>' +
            '<h3>' + '-- Legens navn --' + '</h3>' +
            '<div class="iconbar">'+
            '<table style="width:100%;">'+
            '<tbody>'+
            '<tr>'+
            '<td style="width:5%"><span class="fdficon">&#xf405;</span></td><td style="width:10%">' + 'Deltagere' + '</td>'+
            '<td style="width:5%"><span class="fdficon">&#xf3ba;</span></td><td style="width:15%">' + 'Tid' + ' min</td>'+
            '<td style="width:5%"><span class="fdficon">&#xf41e;</span></td><td style="width:10%">' + 'Alder' + '+</td>'+
            '<td style="width:5%"><span class="fdficon">&#xf360;</span></td><td style="width:15%">' + 'Areal' + '</td>'+
            '</tr>'+
            '</tbody>'+
            '</table>'+
            '</div>'+
            '</figcaption>' +
            '</figure>');
    $("#modal-leg .modal-body .leg-content").html('<div>' + description + '</div>' +
                                                  '<div>' + category_overview + '</div>' +
                                                  '<div>' + end + '</div>');
    $("#modal-leg a[leg]").click(openLeg);
    $("#modal-leg .category-about[category]").click(function() {
        pushState(showCategory(this.getAttribute("category")));
    });

    $("#modal-leg").off("shown.bs.modal");
    $("#modal-leg").modal("show");
    contactify();
    ga('send', 'pageview', location.pathname);
}

function sort_lege(rankings) {
    debug("sorting");
    _r=rankings;
    $("#profiler").text("sorting");
    var start_time = performance.now();
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
            return a.document.name.localeCompare(b.document.name, "da");
        }
        return b.score - a.score;
    });


    // $("#elements").fadeOut(200);
    $("#elements").empty();
    var nodes = rankings.map(function(leg) {
        return leg.document.node;
    }, this);
    $("#elements").append(nodes);

    $("#elements").show();


    // $("#elements").fadeIn(200);

    // $("#elements").isotope("updateSortData").isotope();
    var end_time = performance.now();
    $("#profiler").text("lege: "+(end_time - start_time) +" total: " + (end_time - total_time));

    return;
}

//////// Disabled for now ////////
// function similarLege(leg) {
//     if (leg.game_categories.length == 0) {
//         return [];
//     }
//     var category = leg.game_categories[0];
//     var similar = [];
//     var start = randi(0, lege.length);
//     for (var l = 0; l < lege.length; l++) {
//         var other = lege[(start + l) % lege.length];
//         for (var c = 0; c < other.game_categories.length; c++) {
//             if (other.game_categories[c] === category) {
//                 similar.push(other);
//                 break;
//             }
//         }
//         if (similar.length >= 4) {
//             return similar;
//         }
//     }
//     return similar;
// }
//////////////////////////////////

function scrollToTop(duration) {
    var to = 0;
    var start = $(window).scrollTop();
    var change = to - start;
    var increment = 20;
    var deferred = $.Deferred();

    if (start == to) {
        console.log("scroll already at top");
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
            var start_time = performance.now();
            history.replaceState({}, "", url);
            var end_time = performance.now();
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
    if (text.search(/^profile[r]?[ :=]+on/) != -1) {
        console.log("profiler enabled");
        $("#profiler").show();
    }
    if (text.search(/^profile[r]?[ :=]+off/) != -1) {
        console.log("profiler disabled");
        $("#profiler").hide();
    }
    if (text.search(/^visualdebug[ :=]+on/) != -1) {
        console.log("visualdebug enabled");
        debug.tag.show();
    }
}


function onYouTubeIframeAPIReady() {
    console.log("youtube is ready");
}

function lazy() {
    var delay = 5;
    var timer = window.setInterval(lazyLoader, delay);

    var count = 0;
    var progressbar = $("#progressbar");
    progressbar.show();

    function lazyLoader() {
        if (typeof _r === "undefined") {
            console.log("Not yet ready");
            return;
        }
        console.log("doing lazy");

        var selected = _r;

        for (var i = 0; i < selected.length; i++) {
            var current = selected[i].document;
            if (!current.image) {
                lazyLoadImage(current);
                count++;
                progressbar.css("width", (count/lege.length * 100) + "%");
                return;
            }
        }

        var all = lege;
        for (var i = 0; i < all.length; i++) {
            var current = all[i];
            if (!current.image) {
                lazyLoadImage(current);
                count++;
                progressbar.css("width", (count/lege.length * 100) + "%");
                return;
            }
        }
        progressbar.slideUp();
        debug("shown");
        window.clearInterval(timer);
    }

    function lazyLoadImage(leg) {
        _leg = leg;
        if (!leg || !leg.node) {
            window.clearInterval(timer);
        }
        leg.image = true;
        var img = leg.node.find("img[data-src]");
        img.attr("src", img.attr("data-src"));
    }
}





















//// Common Game Parts
function randf(min, max) {
    return Math.random() * (max - min) + min;
}
function randi(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}
