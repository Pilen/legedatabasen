var work = 0;

//// SearchIndex
// A general solution for searching in a collection of documents
// A document could be anything really, an article, a product, a blogpost,
// pretty much anything. You must supply the methods for accesing data in each
// document by its `fields'.
//
// A SearchIndex works as follows: First it is created, with a possible set of options.
// Then the SearchIndex is configured, specifying fields, how to access ids, adding documents.
// Then the SearchIndex is compiled, during compilation various indexes are created depending on the search method.
// After compilation the SearchIndex is static in the sense that the configuration cant be changed.
// When the SearchIndex has been compiled it can be searched.
//
// Searching ...
function SearchIndex(options) {
    this._documents = [];
    this._fields = [];
    this._get_id = function(document) {return document.id;};
    this._compiled = false;
    this._trie = new trie();
    // this._document_length = {};
    // this._avg_document_length = 0;
    this._words = {};

    this._search_methods = {};

    this._query = "";
    this._filters = {};
    this._timer = null;

    // Create a copy of the given options, with default values for any missing
    options = options || {};
    this._options = {
        k: options.k || 1.2,
        b: options.b || 0.75,
        overlap_power: options.overlap_power || 10,
        length_power: options.length_power || 10,
        word_weight: options.word_weight || 1.0,
        prefix_weight: options.prefix_weight || 1.0,
        substring_weight: options.substring_weight || 1.0,
        callback: options.callback,
        method: options.method || "trie",
        delay: options.delay || 200
    };


    //////// Configuration ////////
    // Before compile is called

    // Add a new field to the search index.
    // A field is a a property of each document that should be searched.
    // Fields can be assigned a weight specifying the importance of finding a match in this field for a document.
    //
    this.add_field = function(field, weight) {
        if (this._compiled) {throw Error("SearchIndex already compiled");}
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
    // Add a document or an array of documents to the searchindex.
    this.add = function(documents) {
        if (this._compiled) {throw Error("SearchIndex already compiled");}
        if (documents instanceof Array) {
            this._documents = this._documents.concat(documents);
        } else {
            this._documents.push(documents);
        }
        return this;
    };

    // Remove documents
    // Removes either the document with the given id.
    // Or, if no id is given, removes ALL documents from the SearchIndex.
    this.remove = function(id) {
        if (this._compiled) {throw Error("SearchIndex already compiled");}
        if (typeof document === "undefined") {
            this._documents = [];
        }
        this._documents = this._documents.filter(function (document) {
            return id !== this._get_id(document);
        });
    };

    // Specify how to find the id of each document.
    // Accepts either a function or a property name.
    // Beaware that the id of a document should NOT change after the searchindex has been compiled.
    this.id = function(id) {
        if (this._compiled) {throw Error("SearchIndex already compiled");}
        if (typeof id === "function") {
            this._get_id = id;
        } else {
            this._get_id = function(document) {return document[id];};
        }
        return this;
    };

    // Specify the search method.
    // The searchmethod is the name of the internal algorithm for calculating results.
    this.method = function(method) {
        this._options.method = method;
        return this;
    };

    // Set a callback that will recieve the results of searching.
    // This is a way of using the SearchIndex asynchronously.
    // When the search query is changed, the SearchIndex will wait for delay milliseconds before calculating the result.
    // And then call the given callback with the results.
    // This way you can simply hook an input field directly with the SearchIndex and the calculation will only be done when the user stops typing.
    //
    // If you want the results immediately, call the `get_ranking' method.
    this.callback = function(callback) {
        this._options.callback = callback;
        return this;
    };

    // Set the delay before calculating search results and calling the callback.
    // Internally a timer is used and reset everytime the search query is changed, only firing after the delay has passed.
    // Updating filters will trigger immediately.
    // The delay is specified in milliseconds.
    this.delay = function(delay) {
        this._options.delay = delay;
        return this;
    };

    // Create a new filter
    // While the search query will change the resulting ranking of the documents, filters will entirely remove documents not matching.
    // Filters are basically functions being run on every document, if it returns true it is kept else it is discarded from the results.
    // Filters have: a name (string), a predicate function, and a preprocess function
    //
    this.create_filter = function(name, func, preprocess) {
        if (this._compiled) {throw Error("SearchIndex already compiled");}
        if (this._filters[name]) {throw Error("SearchIndex already has a filter named " + name);}
        var arg = undefined;
        if (preprocess) {
            arg = preprocess(arg);
        }
        this._filters[name] = {func: func,
                               arg: arg,
                               preprocess: preprocess};
        return this;
    };

    this.create_selection = function(name) {
        function exists(document, arg) {
            if (arg) {
                var id = this._get_id(document);
                return Boolean(arg[id]);
            } else {
                return true;
            }
        };
        function preprocess(arg) {
            var set = {};
            arg.map(function(document){
                var id = this._get_id(document);
                set[id] = true;
            }, this);
        }
        this.create_filter(name, exists, preprocess);
    };

    // Compile the SearchIndex.
    // Serveral of the internal algorithms require a slightly timeconsuming preprocessing step.
    // This preprocessing is done by the compile method. Call it once you are done setting up the SearchIndex.
    // Once compiled, the basic settings can no longer be modified and no new documents can be added.
    // Only modifying the search query, updating the filters and getting a ranking is possible.
    // If you want to modify a SearchIndex a new one has to be created.
    this.compile = function() {
        if (this._compiled) {throw Error("SearchIndex already compiled");}
        this._compiled = true;
        this._documents.map(function(document) {
            var id = this._get_id(document);
            if (typeof id === "undefined") {throw Error("SearchIndex encountered an undefined id");}
            this._fields.map(function(field, i) {
                var combined_id = id + "/" + i;
                var data = field.get(document);
                var tokens = tokenize(data);
                // this._document_length[id] = (this._document_length[id] || 0) + tokens.length; // Sum of all fields
                // this._avg_document_length += this._document_length[id] / this._documents.length;
                this._trie.insert(tokens, combined_id, field.weight);
                tokens.map(function(token) {
                    var contains = this._words[token];
                    if (!contains) {
                        contains = {};
                        this._words[token] = contains;
                    }
                    var entry = contains[id];
                    if (!entry) {
                        entry = {};
                        contains[id] = entry;
                    }
                    contains[i] = entry;

                }, this);
            }, this);
        }, this);

        return this;
    };

    //////// Use ////////
    // After compile is called

    this.query = function(query) {
        if (!this._compiled) {throw Error("SearchIndex not yet compiled");}
        this._query = query || "";
        return this._schedule_search();
    };

    this.update_filter = function(name, arg) {
        if (!this._compiled) {throw Error("SearchIndex not yet compiled");}
        var filter = this._filters[name];
        if (!filter) {throw Error("SearchIndex does not have a filter named " + name);}
        filter.arg = filter.preprocess(arg);
        return this._schedule_search();
    };

    // Perform the actual seach.
    // Calculate the ranking of each document and use the filters.
    // This method uses the filters to make a selection of documents and then calculates the rankings.
    // Any callback specified for the SearchIndex will be called and the result set will be returned.
    // This method is only really required to be called manually if no callback has been specified.
    // The method is automatically called when the search query or filters are updated.
    this.search = function() {
        if (!this._compiled) {throw Error("SearchIndex not yet compiled");}
        work = 0;

        // Stop timer
        if (this._timer) {
            window.clearTimeout(this._timer);
        }
        this._timer = null;

        // Do filtering
        var filters = Object.keys(this._filters).map(function(name){
            return this._filters[name];
        }, this);
        // For every document every filter must return true
        var selected = this._documents.filter(function(document) {
            return filters.every(function(filter) {
                return filter.func(document, filter.arg);
            });
        });

        var tokens = tokenize(this._query);

        // An empty search
        if (!tokens || !tokens[0]) {
            var result = selected.map(function(document) {
                var id = this._get_id(document);
                return {id: id,
                        document: document,
                        score: 0};
            }, this);
            if (this._options.callback) {
                this._options.callback(result);
            }
            return result;
        };

        // Perform search (and measure duration)
        var f = this._search_methods[this._options.method];
        var start_time = +new Date();
        var result = f.call(this, tokens, selected);
        var end_time = +new Date();
        console.log("Search duration: " + (end_time - start_time));

        if (this._options.callback) {
            this._options.callback(result);
        }
        return result;
    };

    //////// Internal ////////
    // Internal methods, do NOT call these directly


    // Start the timer or immediately call search
    // If the delay is below zero or no callback is given, the search is performed immediately,
    // else null is returned and the calculation is done asynchronously.
    this._schedule_search = function() {
        if (this._options.delay >= 0 && this._options.callback) {
            if (this._timer) {
                window.clearTimeout(this._timer);
            }
            var _this = this; // Used to avoid javascript quirkyness. See https://developer.mozilla.org/en-US/docs/Web/API/WindowTimers/setTimeout#The_this_problem
            window.setTimeout(function(){_this.search();}, this._options.delay);
            return null;
        } else {
            return this.search();
        }
    };

    this._search_methods.nop = function(queries, documents) {
        return documents.map(function(document) {
            return {id:this._get_id(document),
                    document:document,
                    score:1};
        }, this);
    };

    this._search_methods.plain = function(queries, documents) {
        var result = documents.map(function(document) {
            var score = 0;
            this._fields.map(function(field) {
                var data = field.get(document);
                data = data.toLowerCase();
                queries.map(function(q) {
                    work++;
                    if (data.indexOf(q) != -1) {
                        score += field.weight;
                    }
                });
            });
            var id = this._get_id(document);
            return {id:id, document:document, score:score};
        }, this);
        result.sort(function(a, b) {return b.score - a.score;});
        return result;
    };

    this._search_methods.regex = function(queries, documents) {
        var RegExp_escape = function(s) {
            return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        };

        var reg = queries.map(function(q) {
            return "(?:" + RegExp_escape(q) + ")";
        }).join("|");
        var regex = new RegExp(reg, "gi");

        var result = documents.map(function(document) {
            var score = 0;
            this._fields.map(function(field) {
                var data = field.get(document);
                work++;
                var match = data.match(regex);
                if (match) {
                    score += match.length * field.weight;
                }
            });
            var id = this._get_id(document);
            return {id:id, document:document, score:score};
        }, this);
        result.sort(function(a, b) {return b.score - a.score;});
        return result;
    };

    this._search_methods.hash = function(query, documents) {
        work = 0;

        if (!documents) {
            documents = this._documents;
        }

        var queries = tokenize(query||"");

        var result = documents.map(function(document) {
            var score = 0;
            this._fields.map(function(field) {
                var data = field.get(document);
                queries.map(function(q) {
                    work++;
                    if (data.indexOf(q) != -1) {
                        score += field.weight;
                    }
                });
            });
            var id = this._get_id(document);
            return {id:id, document:document, score:score};
        }, this);
        result.sort(function(a, b) {return b.score - a.score;});
        return result;
    };

    this._search_methods.trie = function(queries, documents) {
        var result = documents.map(function(document) {
            var id = this._get_id(document);
            var score = 0;
            queries.map(function(query) {
                var len = query.length;
                for (var i = 0; i < len; i++) {
                    var q = query.substring(i, len);
                    this._fields.map(function(field, i) {
                        var combined_id = id + "/" + i;
                        var node = this._trie.lookup(q, combined_id);
                        // var percentage = (node.depth * 2) / (node.depth + q.length);
                        // var percentage = 1 / (1 + (q.length - node.depth));
                        var percentage = node.depth / q.length;
                        var term_score = 0;
                        if (node.score.words > 0) {
                            term_score = this._options.word_weight;
                        } else if (node.score.prefix > 0) {
                            term_score = this._options.prefix_weight;
                        } else if (node.score.substring > 0) {
                            term_score = this._options.substring_weight;
                        }
                        score += percentage * term_score * field.weight;
                    }, this);
                    // break;
                }
                // var node = this._trie.lookup(q, id);
                // var percentage = (node.depth * 2) / (node.depth + q.length);
                // // var percentage = overlap(node.word, q);
                // // percentage = 1;
                // // Squaring as an aproximation of normalization across frequencies (TF-IDF)
                // percentage = Math.pow(percentage, this._options.overlap_power);
                // var length = Math.pow(node.depth, this._options.length_power);
                // var a = percentage * length * (1/node.length) * (node.score.words?1:0) * node.score.words * this._options.word_weight;
                // var b = percentage * length * (1/node.length) * (node.score.prefix?1:0) * node.score.prefix * this._options.prefix_weight;
                // var c = percentage * length * (1/node.length) * (node.score.substring?1:0) * node.score.substring * this._options.substring_weight;

                // // var freq = Math.log(1 +
                // //                     node.score.words * this._options.word_weight +
                // //                     node.score.prefix * this._options.prefix_weight +
                // //                     node.score.substring * this._options.substring_weight);
                // var freq = (node.score.words * this._options.word_weight +
                //             node.score.prefix * this._options.prefix_weight +
                //             node.score.substring * this._options.substring_weight);
                // // console.log("freq:", freq);
                // freq = freq * percentage * length;
                // var idf = Math.log(this._documents.length / node.count);
                // var k = this._options.k;
                // var b = this._options.b;
                // var term_score = idf * ((freq * (k + 1)) / (freq + k*(1 - b + b * (this._document_length[id] / this._avg_document_length))));
                // term_score = freq;
                // score += term_score;
                // // field_score += percentage;
                // // console.log(node.word+"::   "+"p:"+percentage+" * w:"+node.words+" = "+percentage*node.words+"\t s:"+node.prefix+", ps.:"+percentage*node.prefix);
                // // console.log(node.word+"::   "+ percentage+"*"+node.words+"w = "+a+"\t "+ percentage+"*"+node.prefix+"p = "+b+"\t "+ percentage+"*"+node.substring+"s = "+c);
                // // console.log(document.url, node)
                // // console.log(node.word+"::   "+percentage+"%\t a:"+a+"\t b:"+b+"\t c:"+c+" = "+(a+b+c));
            }, this);
            // if (document.url == "flipflapfange") {console.log(score);}
            return {id:id, document:document, score: score};
        }, this);

        result.sort(function(a, b) {return b.score - a.score;});
        return result;
    };
}




/*** Parsing data: ***/

var tokenize = function(text) {
    text = text
        .toLowerCase()
        .replace(/[^\wæøåÆØÅ]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .split(" ");
    return text;
};



// var overlap = function(w1, w2) {
//     var length1 = w1.length;
//     var length2 = w2.length;
//     var min = length1 < length2 ? length1 : length2;
//     for (var i = 0; i < min; i++) {
//         if (w1[i] !== w2[i]) {
//             break;
//         }
//     }
//     return (i * 2) / (length1 + length2);
// }

function trie() {
    this._base_node = {children: {},
                       scores: {},
                       score: 0
                      };
    // TODO: Score not used?

    this.insert = function(tokens, id, weight) {
        this._base_node.scores[id] = {words: 0, prefix:0, substring:0};
        tokens.map(function(token) {
            for (var j = 0; j < token.length; j++) { // Insert all subfixess (starting from j)
                var node = this._base_node;
                for (var i = j; i < token.length; i++) { // Insert letters of subwords
                    var new_node = node.children[token[i]];
                    if (!new_node) {
                        new_node = {children: {},
                                    scores: {},
                                    score: 0
                                   };
                        node.children[token[i]] = new_node;
                    }
                    // Get/create score
                    var score = new_node.scores[id];
                    if (!score) {
                        score = {words: 0, prefix:0, substring:0};
                        new_node.scores[id] = score;
                    }
                    // Calculate score
                    if (j == 0) { // Start of full word
                        if (i == (token.length - 1)) { // To end of full word
                            score.words += 1 * weight;
                        } else {
                            score.prefix += ((i + 1) / token.length) * weight;
                        }
                    } else {
                        score.substring += ((i - j + 1) / token.length) * weight;
                    }
                    node = new_node;
                }
            }
        }, this);
        return this;
    };

    this.lookup = function(token, id) {
        var node = this._base_node;
        for (var i = 0; i < token.length; i++) {
            var next = node.children[token[i]];
            if (!next || typeof next.scores[id] === "undefined") {
                break;
            }
            work++;
            node = next;
        }
        var count = Object.keys(node.scores).length;
        var score = node.scores[id];
        return {score:score, count:count, depth:i};
    };

    // this.normalize = function() {
    //     var nodes = [this._base_node];
    //     while (nodes.length > 0) {
    //         var node = nodes.pop();
    //         var keys = Object.keys(node.scores);
    //     }
    // };

    this.nodes = function() {
        function recurse(node) {
            var sum = 0;
            var children = Object.keys(node.children);
            sum += children.length;
            for (var i = 0; i < children.length; i++) {
                var child = children[i];
                sum += recurse(node.children[child]);
            }
            return sum;
        }
        return recurse(this._base_node);
    };
}
