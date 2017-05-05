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

var group_2 = "pusling|tumling|bæver|bæverflok|familie|famillie|familiespejder|familliespejder|mikro|mikrospejder|mini|minispejder|små";
var group_7 = "pilt|væbner|ulve|ulveflok|junior|juniortrop|mellem|mellemste";
var group_13 = "seniorvæbner|senior|spejder|spejdertrop|seniortrop|rover|roverklan|stor|større|største";
var regex_2 = new RegExp("\\b("+group_2+")[ers]*\\b", "i");
var regex_7 = new RegExp("\\b("+group_7+")[ers]*\\b", "i");
var regex_13 = new RegExp("\\b("+group_13+")[ers]*\\b", "i");
var regex_any = new RegExp("\\b("+group_2+"|"+group_7+"|"+group_13+")[ers]*\\b", "gi");

function debug(string) {
    console.log("debug:", string);
    debug.tag.text(string);
}
// debug = console.log


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

    initStickyMenubar();

    initNavigation();

    initFilters();

    // Initialize lege
    initLege(data[0]).then(function() {
        $('#lege').on("click", "a.element-item", function(event){
            event.preventDefault();
            pushState(showLeg(this.getAttribute("leg")));
            return false;
        });
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
        //category_swiper.init();
        setTimeout(function () {category_swiper.init(); }, 1); // TODO: test om man kan bruge ovenstående linje (den er rykket i forhold til tidligere)
        lazy();
        debug("done");
    });
}

function initSwiper() {
    var html = categories.map(function(category) {
        return ('<div class="swiper-slide category outlined" id="'+category.index+'" ' +
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
        paginationClickable: true,
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
    // category_swiper.on("slideChangeStart", function(swiper) {
    //     console.log("slideChangeStart", swiper);
    // });
    category_swiper.on("slideChangeEnd", function(swiper) {
        total_time = performance.now();
        var selected = swiper.realIndex;
        $("#profiler").text(categories[selected].name);
        if (selected != category) {
            category = selected;
            // showCategory(selected, true /* No reset */);
            replaceState(showCategory(selected));
        }
    });
}

function initSelector() {
    var tmp_alle = categories[Math.floor(categories.length / 2)];
    var tmp_categories = categories.filter(function(c, k) {return c !== tmp_alle;});
    var row_1 = tmp_categories.slice(0, 6);
    var row_2 = tmp_categories.slice(row_1.length);
    row_1.splice(Math.floor(row_1.length / 2), 0, tmp_alle);
    function selector(category) {
        return ('<input type="radio" name="category-selector" id="category-selector-' + category.index + '" value="' + category.index + '"/>' +
                '<label for="category-selector-' + category.index + '">' +
                '<div class="category outlined" id="selector-'+category.index+'" ' +
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
        console.log("selected: "+selected);
        debug(selected);
        debug(categories[selected]);
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
                var classes = "";
            } else {
                if (leg.game_categories.length > 0) {
                    var image = "/images/lege/" + leg.game_categories[0].name + "-default.png";
                    var classes = "default";
                } else {
                    var image = "/images/lege/default.png";
                    var classes = "";
                }
            }

            var in_categories = "";
            if (leg.game_categories.length > 0) {
                in_categories = '<img class="modal-category" src="/images/categories/'+leg.game_categories[0].image+'" alt="'+leg.game_categories[0].name+'" />';
            }
            leg.node = $(
                ('<a href="leg/'+leg.url+'" class="element-item '+leg.tags+'" data-category="'+leg.inde+'" score=0 title="'+leg.name+'" leg="'+leg.index+'">'+
                 '<div class="leg '+ classes +'">'+
                 '<img data-src="' + image + '" class="leg-box-image lazy" src="">' +
                 // (leg.videos.length > 0 ? '<p class="outlined fdficon video-icon">&#xf407;</p>' : '')+
                 (leg.videos.length > 0 ? '<p class="outlined fdficon video-icon">&#xf2a7;</p>' : '')+
                 // (leg.videos.length > 0 ? '<p class="outlined fdficon video-icon">&#xf409;</p>' : '')+
                 '<div class="headerbar">'+
                 '<p class="navn">'+leg.name+'</p>'+
                 '</div>'+
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
                 '<div class="teaserbar">'+
                 '<div class="categories">' + in_categories + '</div>' +
                 '<p>' + (leg.teaser || '') + '</p>' +
                 '</div>'+
                 '</div>'+
                 '</a>'));
            leg.node.appendTo('#lege');
            return leg;
        });
        deferred.resolve(lege);
    }
    doStuff();
    return deferred.promise();
}

function initStickyMenubar() {
    function stickyMenubar() {
        var position = $(this).scrollTop();
        if (position >= menubar_offset) {
            $(".navigation").css("position", "fixed");
        } else {
            $(".navigation").css("position", "static");
        }
    }
    $(window).resize(function() {
        menubar_offset = $(".navigation-filler").offset().top;
        stickyMenubar();
    }).resize();
    $(window).scroll(function() {
        stickyMenubar();
    });
}

function initNavigation() {
    // $("#swipe_knap").click(function() {
    //     replaceState(showCategory(category));
    // });
    $(".menu-icon").click(function() {
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
function show404() {return {type: "404", url: "/404", arg: null};}

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
            $(".swiper-container").slideDown(400);
            var category = categories[index];
            if (category_swiper.realIndex !== category.index) {
                category_swiper.slideTo(category.index);
            }
            search.clear();
            search.update_filter("category", category.name);
        },
        update: function(index) {
            scrollToTop(400);
            var category = categories[index];
            if (category_swiper.realIndex !== category.index) {
                category_swiper.slideTo(category.index);
            }
            search.clear();
            search.update_filter("category", category.name);
        },
        hide: function() {
            return $.when(//scrollToTop(400),
                          $(".swiper-container").slideUp(400).promise());
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
            $(".menu-icon").addClass("open");
            $(".filter input[type=radio]").prop("checked", false);
            $(".filter").data("current", null);
            $("#submenu").slideDown(400);
        },
        update: function() {
            $(".filter input[type=radio]").prop("checked", false);
        },
        hide: function() {
            return $.when(//scrollToTop(400),
                $(".menu-icon").removeClass("open"),
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
        show: function(index) {
            $("#modal-leg .modal-body .leg-teaser").html("");
            $("#modal-leg .modal-body .leg-description").html("<h3>404</h3><p>Hmm, det ser ud til at siden du leder efter ikke findes. Vi har sendt Søren ud for at lede</p><p>Du er meget velkommen til at brokke dig til Legeudvalget imens.</p>");
            $("#modal-leg").modal("show");
        },
        update: function(index) {
        },
        hide: function() {
            return stateActions["leg"].hide();
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
    if (url === "") {
        // Just show the default state
        return;
    }

    pushState(show404());
    return;
}

/*******************************************************************************

*******************************************************************************/

function displayLeg(leg) {
    console.log("displayLeg");
    /*
      $("#container").hide();
      $("#filter_knap").hide();
      $("#soeg_knap").hide();
      $("#swipe_knap").hide();
    */

    var description = marked(leg.description.replace(/^#([^\s])/mg, "# $1"));
    d = description;
    var preparation = marked(leg.preparation.replace(/^#([^\s])/mg, "# $1"));
    var note = marked(leg.note.replace(/^#([^\s])/mg, "# $1"));
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
    var video = '';
    if (leg.videos.length > 0) {
        // video = '<iframe width="100%" height="100%" src="//www.youtube.com/embed/' + leg.videos[0] + '"></iframe';
        // video = '<iframe width="100%" height="100%" src="//www.youtube.com/embed/' + leg.videos[0] + '"></iframe';
        // video = '<iframe width="630" height="390" frameborder="0"src="//www.youtube.com/embed/' + leg.videos[0] + '?enablejsapi=1"></iframe';
        // video = '<iframe width="640" height="390" frameborder="0"src="//www.youtube.com/embed/' + leg.videos[0] + '?enablejsapi=1"></iframe';
        // video = '<iframe src="//www.youtube.com/embed/' + leg.videos[0] + '"></iframe';
        video = '<div id="ytplayer-wrapper"><div id="ytplayer"></div></div>';
        // video = '<div class="ytplayer-wrapper"><div id="ytplayer"></div></div>';
    } else {


    }
    $("#modal-leg .modal-body .leg-header").html(
        '<figure id="leg-presentation-image">' +
            (video ? video : '<img src="' + image + '" class="img-responsive" id="leg-presentation-image" />') +
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
    $("#modal-leg .modal-body .leg-description").html('<h3>Beskrivelse:</h3>' + description);
    if (preparation) {
        $("#modal-leg .modal-body .leg-description").append('<h3>Forberedelse</h3>' + preparation);
    }
    if (note) {
        $("#modal-leg .modal-body .leg-description").append('<h3>Noter:</h3>' + note);
    }
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

    ga('send', 'pageview', '/leg/' + leg.url);
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


    // $("#lege").fadeOut(200);
    $("#lege").empty();
    var nodes = rankings.map(function(leg) {
        return leg.document.node;
    }, this);
    $("#lege").append(nodes);

    $("#lege").show();


    // $("#lege").fadeIn(200);

    // $("#lege").isotope("updateSortData").isotope();
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
    if (text.search(/^profile[r]?[ :]+on/) != -1) {
        console.log("profiler enabled");
        $("#profiler").show();
    }
    if (text.search(/^profile[r]?[ :]+off/) != -1) {
        console.log("profiler disabled");
        $("#profiler").hide();
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
        var img = leg.node.find("img.leg-box-image");
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
