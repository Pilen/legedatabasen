
var snow_point = 0;
function snow () {
    function randf(min, max) {
        return Math.random() * (max - min) + min;
    }
    function randi(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    var tag = $("#snow");
    var n = 30;
    var list = [];
    for (var i = 0; i < n; i++) {
        var left = randi(-10, 110);
        var size = randi(10, 25);
        var falling_duration = Math.floor(randi(3000, 6000) / (size / 27.5));
        var swaying_duration = Math.floor(randi(6000, 7000) / (size / 27.5));
        var falling_delay = randi(0, falling_duration);
        var swaying_delay = randi(0, swaying_duration);
        var opacity = randf(0.8, 1.0) * (size / 27.5);
        list.push($('<div style="'+
                    'animation-duration:'+falling_duration+'ms;'+
                    'animation-delay:'+falling_delay+'ms;'+
                    '"><i style="'+
                    'animation-duration:'+swaying_duration+'ms;'+
                    'animation-delay:'+swaying_delay+'ms;'+
                    'left:'+left+'vw;'+
                    'width:'+size+'px;'+
                    'height:'+size+'px;'+
                    'opacity:'+opacity+';'+
                    '"></i></div>'));
    }
    tag.append(list);
    $("#snow i").on("click", function(event) {
    // $(".ribbon").on("click", function(event) {
        snow_point++;
        $(".ribbon").text(snow_point + " point!");
        var submenu_score = $("#submenu .score");
        if (submenu_score.length == 0) {
            submenu_score = $('<div class="score" style="text-align: center; padding: 30px; font-size: 25pt; "></div>');
            $("#submenu").append(submenu_score);
        }
        submenu_score.text(snow_point + " point!");
    });
}
$(document).ready(snow);
