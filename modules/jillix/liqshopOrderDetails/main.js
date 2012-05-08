define(["./jquery.min"], function() {

    var self;

    function init() {

        self = this;

        N.obs("liqshop_order_list").l("selected", orderSelected);
        N.obs("liqshop_order_list").l("unselected", orderUnselected);

        $("#orderItems").on("change", ".archiveCheck", function() {
            itemArchiveCheck(this);
        });
    }


    var templateClass = "orderItemTemplate";
    var itemClass = "orderItem";
    var itemFieldClass = "itemField";
    var orderFieldClass = "orderField";

    var itemTable = $("#orderItems");
    var itemCount = 0;

    function orderSelected(order) {

        // clear all data
        orderUnselected();

        // populate the new fields
        processFields($("." + orderFieldClass), order);
        orderItems(order.items || []);
    }


    function orderUnselected() {

        // reset all the fields
        $("." + orderFieldClass).text("-");

        // empty the item table
        itemTable.find("." + itemClass).remove();
    }


    function itemArchiveCheck(input) {

        var tr = $(input).parent().parent();
        var itemNr = tr.find("[data-field='nr']").text()
        var orderNr = $("#orderNr").text();

        var orderItem = {
            order: orderNr,
            item: itemNr,
            archive: input.checked ? 1 : 0
        };

        // get the branch list
        self.link("archiveItem", { data: orderItem }, function(err, results) {

            var checks = tr.parent().find(".orderItem .archiveCheck");

            for (var i = 0; i < checks.length; i++) {
                if (!checks[i].checked) {
                    return;
                }
            };
            
            self.obs.f("archived");
        });
    } 

    function orderItems(items) {

        itemCount = items.length;

        // find the template again
        var itemTemplate = itemTable.find("." + templateClass);

        for (var i in items) {

            // clone the item template
            var itemRow = itemTemplate.clone();

            // now replace the item fields
            processFields(itemRow.find("." + itemFieldClass), items[i]);
            itemRow.removeClass(templateClass);
            itemRow.addClass(itemClass);
            itemRow.find("input")[0].checked = (items[i].archived ? true : false);

            // add the new row to the DOM
            itemRow.appendTo(itemTable);
        }
    }


    function processFields(elements, dataObj) {

        elements.each(function() {

            var elem = $(this);
            var field = elem.attr("data-field") || "";
            var splits = field.split(".");

            var data = "-";
            var obj = dataObj;

            for (var i = 0; i < splits.length; i++) {

                var split = splits[i];
                obj = obj[split];

                if (!obj) {
                    break;
                }

                if (i + 1 == splits.length) {
                    data = obj;
                }
            }

            elem.text(typeof data === "object" ? JSON.stringify(data) : data);
        });
    }


    return {
        init: init    
    };

});

