function SearchIndex(options) {
    this._documents = [];
    this._fields = [];
    this._get_id = function(document) {return document.id;};
    this._compiled = false;
    this._trie = new trie();
    this._document_length = {};
    this._avg_document_length = 0;

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
            var id = this._get_id(document);
            if (typeof id === "undefined") {throw Error("SearchIndex encountered an undefined id");}
            this._fields.map(function(field) {
                var data = field.get(document);
                var tokens = tokenize(data);
                this._document_length[id] = (this._document_length[id] || 0) + tokens.length; // Sum of all fields
                this._avg_document_length += this._document_length[id] / this._documents.length;
                this._trie.insert(tokens, id, field.weight);
            }, this);
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
                return {document: document,
                        id: id,
                        score: 0};
            }, this);
        };

        var result = documents.map(function(document) {
            var id = this._get_id(document);
            var score = 0;
            querys.map(function(q) {
                var node = this._trie.lookup(q, id);
                var percentage = (node.depth * 2) / (node.depth + q.length);
                // var percentage = overlap(node.word, q);
                // percentage = 1;
                // Squaring as an aproximation of normalization across frequencies (TF-IDF)
                percentage = Math.pow(percentage, this.options.overlap_power);
                var length = Math.pow(node.depth, this.options.length_power);
                var a = percentage * length * (1/node.length) * (node.score.words?1:0) * node.score.words * this.options.word_weight;
                var b = percentage * length * (1/node.length) * (node.score.prefix?1:0) * node.score.prefix * this.options.prefix_weight;
                var c = percentage * length * (1/node.length) * (node.score.substring?1:0) * node.score.substring * this.options.substring_weight;

                // var freq = Math.log(1 +
                //                     node.score.words * this.options.word_weight +
                //                     node.score.prefix * this.options.prefix_weight +
                //                     node.score.substring * this.options.substring_weight);
                var freq = (node.score.words * this.options.word_weight +
                            node.score.prefix * this.options.prefix_weight +
                            node.score.substring * this.options.substring_weight);
                // console.log("freq:", freq);
                freq = freq * percentage * length;
                var idf = Math.log(this._documents.length / node.count);
                var k = this.options.k;
                var b = this.options.b;
                var term_score = idf * ((freq * (k + 1)) / (freq + k*(1 - b + b * (this._document_length[id] / this._avg_document_length))));
                term_score = freq;
                score += term_score;
                // field_score += percentage;
                // console.log(node.word+"::   "+"p:"+percentage+" * w:"+node.words+" = "+percentage*node.words+"\t s:"+node.prefix+", ps.:"+percentage*node.prefix);
                // console.log(node.word+"::   "+ percentage+"*"+node.words+"w = "+a+"\t "+ percentage+"*"+node.prefix+"p = "+b+"\t "+ percentage+"*"+node.substring+"s = "+c);
                // console.log(document.url, node)
                // console.log(node.word+"::   "+percentage+"%\t a:"+a+"\t b:"+b+"\t c:"+c+" = "+(a+b+c));
            }, this);
            return {id:id, document:document, score: score};
        }, this);

        result.sort(function(a, b) {return b.score - a.score;});
        return result;
    }


    function trie() {
        this._base_node = {children: {},
                           scores: {},
                           score: 0};

        this.insert = function(tokens, id, weight) {
            this._base_node.scores[id] = {words: 0, prefix:0, substring:0};
            tokens.map(function(token) {
                for (var j = 0; j < token.length; j++) {
                    var node = this._base_node;
                    for (var i = j; i < token.length; i++) {
                        var new_node = node.children[token[i]]
                        if (!new_node) {
                            new_node = {children: {},
                                        scores: {},
                                        score: 0};
                            node.children[token[i]] = new_node;
                        }
                        var score = new_node.scores[id];
                        if (!score) {
                            score = {words: 0, prefix:0, substring:0};
                            new_node.scores[id] = score;
                        }
                        if (j == 0) {
                            if (i == (token.length - 1)) {
                                score.words+=1 * weight;
                            } else {
                                score.prefix += ((i+1) / token.length) * weight;
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
                node = next;
            }
            var count = Object.keys(node.scores).length;
            var score = node.scores[id];
            return {score:score, count:count, depth:i};
        };

        this.normalize = function() {
            var nodes = [this._base_node];
            while (nodes.length > 0) {
                var node = nodes.pop();
                var keys = Object.keys(node.scores);
            }
        };
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
