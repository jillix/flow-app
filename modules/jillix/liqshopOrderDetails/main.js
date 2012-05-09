define(["./jquery.min"], function() {

    var self;

    var templateClass = "orderItemTemplate";
    var itemClass = "orderItem";
    var itemFieldClass = "itemField";
    var orderFieldClass = "orderField";

    var itemTable, itemTableDone;


    function init() {

        self = this;

        itemTable = $("#orderItems");
        itemTableDone = $("#orderItemsDone");

        N.obs("liqshop_order_list").l("selected", orderSelected);
        N.obs("liqshop_order_list").l("unselected", orderUnselected);

        $("#orderDetail").on("change", ".archiveCheck", function() {
            itemArchiveCheck(this);
        });
        $("#orderDetails").on("click", ".bulkArchive", function() {

            if (this.id === "archiveAll") {
                bulkOperation(true);
            } else if (this.id === "unarchiveAll") {
                bulkOperation(false);
            }

            return false;
        });
    }


    function bulkOperation(archiving) {

        var table = archiving ? itemTable : itemTableDone;
        var itemRows = table.find(".orderItem .archiveCheck");

        if (!itemRows.length) {
            return;
        }

        var result = confirm("Bist du sicher dass du alle Artikel als \"" + (archiving ? "" : "un") + "archiviert\" markieren moechtest?");

        if (result) {
            table.find(".orderItem .archiveCheck").each(function() {
                this.checked = archiving;
                itemArchiveCheck(this);
            });
        }
    }


    function unarchiveAll() {

        var result = confirm("Bist du sicher, dass du alle Artikel als \"Unarchiviert\" markieren moechtest?");

        if (result) {
            itemTableDone.find(".orderItem .archiveCheck").each(function() {
                this.checked = false;
                itemArchiveCheck(this);
            });
        }

        return false;
    }


    var cachedOrder = null;

    function orderSelected(order) {

        // clear all data
        orderUnselected();

        $("#noItmSel").hide();
        $("#orderDetail").show();

        cachedOrder = order;

        // populate the new fields
        processFields($("." + orderFieldClass), order);
        orderItems(order.items || []);
    }


    function orderUnselected() {

        $("#noItmSel").show();
        $("#orderDetail").hide();

        cachedOrder = null;

        // reset all the fields
        $("." + orderFieldClass).text("-");

        // empty the item tables
        itemTable.find("." + itemClass).remove();
        itemTableDone.find("." + itemClass).remove();
    }


    function itemArchiveCheck(input) {

        // find the needed information
        var tr = $(input).parent().parent();
        var itemNr = tr.find("[data-field='nr']").text()
        var orderNr = $("#orderNr").text();
        var archived = input.checked ? 1 : 0;

        var orderItem = {
            order: orderNr,
            item: itemNr,
            archive: archived
        };

        // call the archiving operation
        self.link("archiveItem", { data: orderItem }, function(err, results) {

            // change the archived state in the cached item
            updateItemCache(itemNr, archived);

            tr.appendTo(archived ? itemTableDone : itemTable);

            // when the operation is done, if all items are archived,
            // signal the archive event to trigger a refresh
            if (archived) {
                if (itemTable.find(".orderItem").length == 0) {
                    self.obs.f("archived");
                }
            }
        });
    } 


    function updateItemCache(nr, archive) {

        if (!cachedOrder) {
            return
        }

        for (var i in cachedOrder.items) {

            var item = cachedOrder.items[i];

            if (item.nr === nr) {
                if (archive) {
                    var x = new Date();
                    var month = x.getMonth() + 1;
                    var day = x.getDate();
                    var date = "" + x.getFullYear() + (month < 10 ? "0" : "") + month + (day < 10 ? "0" : "") + day;
                    item.archived = date;
                } else {
                    delete item.archived;
                }
            }
        }
    }

    function orderItems(items) {

        // find the template again
        var itemTemplate = itemTable.find("." + templateClass);

        for (var i in items) {

            var isArchived = items[i].archived ? true : false;

            // clone the item template
            var itemRow = itemTemplate.clone();

            // now replace the item fields
            processFields(itemRow.find("." + itemFieldClass), items[i]);
            itemRow.removeClass(templateClass);
            itemRow.addClass(itemClass);
            itemRow.find("input")[0].checked = isArchived;

            // add the new row to the DOM
            itemRow.appendTo(isArchived ? itemTableDone : itemTable);
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

