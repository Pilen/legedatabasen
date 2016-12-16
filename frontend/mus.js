
function mus() {
    var count = 10;
    for (var i = 0; i < count; i++) {
        var xpos = randf(10, 90);
        var ypos = randf(0, 100);
        var tag = $('<img class="mus" src="/images/pebernoed.png" style="'+
                    'position: absolute;'+
                    'left: '+xpos+'%;'+
                    'top: '+ypos+'%;'+
                    'width: 40px;'+
                    'height: 40px;'+
                    'z-index: 1000;'+
                    'opacity: 0.8;'+
                    'cursor: pointer;'+
                    '"></img>');
        $("#lege-wrapper").append(tag);
        tag.click(function(event) {
            $(event.target).remove();
            openUrl("leg/mus");
        });


    }
}

function playMus() {
    var count = randi(5,10);
    var mus = randi(0, count);
    $("#modal-leg .modal-body .leg-description").prepend(
        '<strong>Lad os lege Mus!</strong><div class="mus-pebernoeder"></div>');
    var container = $(".mus-pebernoeder");
    for (var i = 0; i < count; i++) {
        var pebernoed = $('<img src="/images/pebernoed.png" style="'+
                          'cursor: pointer;'+
                          '"></img>');
        container.append(pebernoed);
        if (i == mus) {
            pebernoed.click(function(event){
                $(".mus-pebernoeder").empty();
                $(".mus-pebernoeder").html('<div class="bubble">MUS!</div>');
            });
        } else {
            pebernoed.click(function(event){
                $(event.target).attr("src", "/images/pebernoed-crumbs.png");
            });
        }
    }
}
