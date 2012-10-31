// attach click event to articles
$(".articles li").click(function() {

    window.location = "/details_cart_empty.html";
});

$(".adminCategories li").on("mouseenter", function() {

    $("i", this).show();
});

$(".adminCategories li").on("mouseleave", function() {

    $("i", this).hide();
});

$(".articleTable tbody tr").click(function() {

    window.location = "/details_admin.html";
});