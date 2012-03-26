define(["/@/0/list/jquery.min.js", "./nav", "./details", "./history"], function(j, nav, details, history) {

    nav.init();
    details.init();
    history.init();

//    var div = $("<div>");
//
//    $.ajax({
//        url: "/@/3",
//        success: function(components) {
//            for (var i in components) {
//                var compElem = $("<div>");
//                compElem.text(components[i].name);
//                div.append(compElem);
//            }
//            $("body").append(div);
//        },
//        error: function() {
//           $("body").text("Error");
//        }
//    });
//
//    return {};
});

