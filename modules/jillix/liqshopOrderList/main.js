define(["./jquery.min"], function() {

    var self;

    var ul, branches, archived, search;

    var cachedOrders = {};
    var page = 1;
    var pageSize = 25;
    var maxPage = 0;


    function init(config) {

        self = this;

        N.obs("liqshop_order_details").l("archived", function() { page = 1; refresh(); } );

        ul = $(self.dom).find(".list");
        branches = $("#orders_filter_branch", self.dom);
        archived = $("#orders_filter_archive", self.dom);
        search = $("#orders_search", self.dom);

        // TODO temporarily put logout button hadler here
        $("#logout").click(function() {
            N.logout(function() {
                window.location.reload();
            });
        });

        ul.on("click", "li", function() {
            select($(this));
        });

        $(".filter", self.dom).on("change", function() { page = 1; refresh(); });
        $(".pageHandle", self.dom).on("click", pageRequest);

        fetchBranches();
    }


    function pageRequest() {

        var up = this.id === "orders_forward" ? true : false;

        if (!maxPage || !up && page == 1 || up && page == maxPage) {
            return;
        }

        up ? ++page : --page;

        refresh();
    }


    function clientFilter() {

        unselect();

        var text = $.trim($(this).val()).toLowerCase();

        if (text === "") {
            ul.find("li").show();
            return;
        }

        ul.find("li").each(function() {

            var li = $(this);
            var meta = this.order.meta || [];
            var found = false;

            for (var i in meta) {
                if (meta[i] === text) {
                    found = true;
                }
            }

            found ? li.show() : li.hide();
        });
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
            if (items.length > 1) {
                branches.append("<option value='0'>Alle</option>");
            }

            for (var i in items) {
                branches.append("<option value='" + items[i].short + "'>" + items[i].companyName + "</option>");
            }

            // get the order list
            fetchData();
        });
    }

    function fetchData() {

        var text = $.trim(search.val()).toLowerCase();
        var queryStr =
            "?archive=" + archived.val() +
            "&branch=" + branches.val() +
            (text === "" ? "" : "&search=" + encodeURIComponent(text)) +
            "&skip=" + ((page - 1) * pageSize) + "&limit=" + pageSize;

        var href = window.location.href + "@/liqshop_order_list/getOrders" + queryStr + "&export=1";
        $("#listExport", self.dom).attr("href", href);

        // get the order list
        self.link("getOrders", { query: queryStr  }, function(err, orders) {

            ul.empty();

            // page computations
            maxPage = Math.floor((orders.shift() - 1) / pageSize) + 1;

            $("#orders_of", self.dom).text(maxPage || "-");
            $("#orders_page", self.dom).text(maxPage ? page : "-");

            // display items
            for (var i = 0; i < pageSize && i < orders.length; i++) {

                var litm = $("<li>");
                litm.append(
                        "<span class='orderdate'>" +
                            orders[i].date +
                        "</span> | " +
                        "<span class='ordernr'>" +
                            orders[i]._c +
                        "</span>")
                    .appendTo(ul)
                    [0].order = orders[i];

                if (orders[i]._c.length == 8) {
                    litm.addClass("red");
                }
            }
        });
    }

    return init;

});

