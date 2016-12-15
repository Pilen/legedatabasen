
function mus() {
    function randf(min, max) {
        return Math.random() * (max - min) + min;
    }
    function randi(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    var count = 10;
    for (var i = 0; i < count; i++) {
        var xpos = randf(0, 100);
        var ypos = randf(0, 100);
        var tag = $('<img class="mus" src="images/pebernoed.png" style="'+
                    'position: absolute;'+
                    'left: '+xpos+'%;'+
                    'top: '+ypos+'%;'+
                    'width: 40px;'+
                    'height: 40px;'+
                    'z-index: 1000;'+
                    'opacity: 0.8;'+
                    'cursor: pointer;'+
                    '"></img>');
        tag.click(function(event) {
            $(event.target).remove();
            var count = randi(5,10);
            var mus = randi(0, count);
            console.log(mus);
            $("#modal-leg .modal-body .leg-header").html(
                '<p> </p>');
            // $("#modal-leg .modal-body .leg-teaser").html("<strong>Mus, en klassisk Juleleg</strong>");
            $("#modal-leg .modal-body .leg-description").html(
                '<strong>Lad os lege Mus!</strong><p>En klassisk Juleleg</p><div class="mus-pebernoeder"></div>');
            var container = $(".mus-pebernoeder");
            for (var i = 0; i < count; i++) {
                var pebernoed = $('<img src="images/pebernoed.png" style="'+
                                  'cursor: pointer;'+
                                  '"></img>');
                container.append(pebernoed);
                if (i == mus) {
                    pebernoed.click(function(event){
                        console.log("MUS!");
                        $(".mus-pebernoeder").empty();
                        $(".mus-pebernoeder").html('<div class="bubble">MUS!</div>');
                    });
                } else {
                    pebernoed.click(function(event){
                        console.log("ikke mus");
                        $(event.target).attr("src", "images/pebernoed-crumbs.png");
                    });
                }
            }
            $("#modal-leg").modal("show");
        });
        $("#lege-wrapper").append(tag);
    }

}
