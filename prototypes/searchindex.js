var work = 0;

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
    this._method = "trie"

    options = options || {};
    this.options = {
        k: options.k || 1.2,
        b: options.b || 0.75,
        overlap_power: options.overlap_power || 10,
        length_power: options.length_power || 10,
        word_weight: options.word_weight || 1.0,
        prefix_weight: options.prefix_weight || 1.0,
        substring_weight: options.substring_weight || 1.0
    };


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
    this.id = function(id) {
        if (this._compiled) {throw Error("SearchIndex already this._compiled");}
        if (typeof id === "function") {
            this._get_id = id;
        } else {
            this._get_id = function(document) {return document[id];};
        }
        return this;
    };

    this.method = function(method) {
        this._method = method;
    }

    this.compile = function() {
        if (this._compiled) {throw Error("SearchIndex already this._compiled");}
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

    this.search = function(query, documents) {
        if (!this._compiled) {throw Error("SearchIndex not yet compiled");}
        work = 0;

        if (!documents) {
            documents = this._documents;
        }

        var queries = tokenize(query||"");
        if (!queries || !queries[0]) {
            return documents.map(function(document) {
                var id = this._get_id(document);
                return {document: document,
                        id: id,
                        score: 0};
            }, this);
        };

        var result;
        var f = this._search_methods[this._method];
        var start_time = +new Date();
        var result = f.call(this, queries, documents);
        var end_time = +new Date();
        console.log("duration " + (end_time - start_time));

        return result;
    }

    this._search_methods.trie = function(queries, documents) {
        var result = documents.map(function(document) {
            var id = this._get_id(document);
            var score = 0;
            queries.map(function(query) {
                var len = query.length;
                for (var i = 0; i < len; i++) {
                    q = query.substring(i, len);
                    this._fields.map(function(field, i) {
                        var combined_id = id + "/" + i;
                        var node = this._trie.lookup(q, combined_id);
                        // var percentage = (node.depth * 2) / (node.depth + q.length);
                        // var percentage = 1 / (1 + (q.length - node.depth));
                        var percentage = node.depth / q.length
                        var term_score = 0;
                        if (node.score.words > 0) {
                            term_score = this.options.word_weight;
                        } else if (node.score.prefix > 0) {
                            term_score = this.options.prefix_weight;
                        } else if (node.score.substring > 0) {
                            term_score = this.options.substring_weight;
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
                // percentage = Math.pow(percentage, this.options.overlap_power);
                // var length = Math.pow(node.depth, this.options.length_power);
                // var a = percentage * length * (1/node.length) * (node.score.words?1:0) * node.score.words * this.options.word_weight;
                // var b = percentage * length * (1/node.length) * (node.score.prefix?1:0) * node.score.prefix * this.options.prefix_weight;
                // var c = percentage * length * (1/node.length) * (node.score.substring?1:0) * node.score.substring * this.options.substring_weight;

                // // var freq = Math.log(1 +
                // //                     node.score.words * this.options.word_weight +
                // //                     node.score.prefix * this.options.prefix_weight +
                // //                     node.score.substring * this.options.substring_weight);
                // var freq = (node.score.words * this.options.word_weight +
                //             node.score.prefix * this.options.prefix_weight +
                //             node.score.substring * this.options.substring_weight);
                // // console.log("freq:", freq);
                // freq = freq * percentage * length;
                // var idf = Math.log(this._documents.length / node.count);
                // var k = this.options.k;
                // var b = this.options.b;
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

    this._search_methods.plain = function(queries, documents) {
        var result = documents.map(function(document) {
            var score = 0;
            this._fields.map(function(field) {
                data = field.get(document);
                queries.map(function(q) {
                    work++;
                    if (data.indexOf(q) != -1) {
                        score += field.weight;
                    }
                })
            })
            var id = this._get_id(document);
            return {id:id, document:document, score:score};
        }, this);
        result.sort(function(a, b) {return b.score - a.score;});
        return result;
    }

    this._search_methods.regex = function(queries, documents) {
        RegExp_escape = function(s) {
            return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        };

        var reg = queries.map(function(q) {
            return "(?:" + RegExp_escape(q) + ")";
        }).join("|")
        var regex = new RegExp(reg, "gi");

        var result = documents.map(function(document) {
            var score = 0;
            this._fields.map(function(field) {
                data = field.get(document);
                work++;
                var match = data.match(regex);
                if (match) {
                    score += match.length * field.weight;
                }
            })
            var id = this._get_id(document);
            return {id:id, document:document, score:score};
        }, this);
        result.sort(function(a, b) {return b.score - a.score;});
        return result;
    }

    this.hash = function(query, documents) {
        work = 0;

        if (!documents) {
            documents = this._documents;
        }

        var queries = tokenize(query||"");

        var result = documents.map(function(document) {
            var score = 0;
            this._fields.map(function(field) {
                data = field.get(document);
                queries.map(function(q) {
                    work++;
                    if (data.indexOf(q) != -1) {
                        score += field.weight;
                    }
                })
            })
            var id = this._get_id(document);
            return {id:id, document:document, score:score};
        }, this);
        result.sort(function(a, b) {return b.score - a.score;});
        return result;
    }


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
                var children = Object.keys(node.children)
                sum += children.length;
                for (var i = 0; i < children.length; i++) {
                    var child = children[i];
                    sum += recurse(node.children[child]);
                }
                return sum;
            }
            return recurse(this._base_node);
        }
    }
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
