define(["./jquery.min"], function() {

    var config = {
        label: function(item) {
            return item._c;
        }
    };

    var self;
    var ul, branches, archived;

    var cachedOrders = {};

    function init() {

        self = this;

        N.obs("liqshop_order_details").l("archived", refresh);

        ul = $("#" + this.miid).find(".list");
        branches = $("#orders_filter_branch");
        archived = $("#orders_filter_archive");

        ul.on("click", "li", function() {
            select($(this));
        });

        $(".filter").on("change", refresh);

        fetchBranches();
    }


    function refresh() {
        unselect();
        fetchData();
    }


    function unselect() {

        // deactivate in UI
        ul.find("li.active").removeClass("active");

        // fire the unselected event
        self.obs.f("unselected");
    }


    function select(orderElem) {

        // if the itel is already selected, unselect it
        if (orderElem.hasClass("active")) {
            unselect();
            return;
        }

        // activate in UI
        ul.find("li").removeClass("active");
        orderElem.addClass("active");

        // fire the selected event
        self.obs.f("selected", orderElem[0].order);
    }


    function fetchBranches() {

        // get the branch list
        self.link("getBranches", function(err, items) {

            branches.empty();
            branches.append("<option value='0'>Alle</option>");

            for (var i in items) {
                branches.append("<option value='" + items[i].short + "'>" + items[i].companyName + "</option>");
            }

            // get the order list
            fetchData();
        });
    }

    function fetchData() {

        var queryStr = "?archive=" + archived.val() + "&branch=" + branches.val();

        // get the order list
        self.link("getOrders", { query: queryStr  }, function(err, orders) {

            ul.empty();

            for (var i in orders) {

                var orderId = 

                $("<li>")
                    .append(
                        "<span class='orderdate'>" +
                            orders[i].time +
                        "</span> | " +
                        "<span class='ordernr'>" +
                            orders[i]._c +
                        "</span>")
                    .appendTo(ul)
                    [0].order = orders[i];
            }
        });
    }

    return {
        init: init    
    };

});

