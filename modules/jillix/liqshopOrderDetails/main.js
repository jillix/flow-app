define(["./jquery.min"], function() {

    var self;

    var templateClass = "orderItemTemplate";
    var itemClass = "orderItem";
    var itemFieldClass = "itemField";
    var orderFieldClass = "orderField";

    var itemTable, itemTableDone;


    function init(config) {

        self = this;

        itemTable = $("#orderItems", self.dom);
        itemTableDone = $("#orderItemsDone", self.dom);

        N.obs("liqshop_order_list").l("selected", orderSelected);
        N.obs("liqshop_order_list").l("unselected", orderUnselected);

        $("#orderDetail", self.dom).on("change", ".archiveCheck", function() {
            itemArchiveCheck(this);
        });
        $("#orderDetail", self.dom).on("click", ".bulkArchive", function() {

            if (this.id === "archiveAll") {
                bulkOperation(true);
            } else if (this.id === "unarchiveAll") {
                bulkOperation(false);
            }

            return false;
        });

        i18n(this.lang);
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
        if (order._c.length == 8) {
	    $("#hbInfo").show();
	    $("#zuhand").show();
        }

        cachedOrder = order;

        // populate the new fields
        processFields($("." + orderFieldClass), order);
        orderItems(order.items || []);
    }


    function orderUnselected() {

        $("#noItmSel").show();
        $("#orderDetail").hide();
        $("#hbInfo").hide();
        $("#zuhand").hide();

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


    var translations = {
        // list
        branch: { en: "Branch", de: "Filiale", fr: "Branche" },
        show:   { en: "Show", de: "Zeige", fr: "Voir" },
        all:    { en: "All", de: "Alle", fr: "Tous" },
        "new":    { en: "New", de: "Neu", fr: "Nouveaux" },
        archived: { en: "Archived", de: "Archiviert", fr: "Archivés" },

        // details
        hbInfoText: { en: "Please ...", de: "Bitte Warenkorb erstellen und den Betrag mit der Artikel-Nr. GU HAPPY BONUS wieder gutschreiben", fr: "Sil vu ple" },
        orderNr:    { en: "Order No.", de: "Bestell-Nr", fr: "Numéro d'ordre" },
        orderDate:  { en: "Order Date", de: "Bestelleingang", fr: "Date d'ordre" },
        customer:   { en: "Customer", de: "Kunde", fr: "Client" },
        company:    { en: "Company", de: "Firma", fr: "Entreprise" },
        name:       { en: "Name", de: "Name", fr: "Nom" },
        zip:        { en: "ZIP", de: "PLZ", fr: "ZIP" },
        city:       { en: "City", de: "Ort", fr: "Ville" },
        customerNo: { en: "Customer No.", de: "Kunden-Nr.", fr: "Numéro de client" },
        moreInfo:   { en: "For the attention of", de: "Zu Handen von", fr: "À l'attention de" },
        unprocessedItems: { en: "Unprocessed Items", de: "Unbearbeitete Artikel", fr: "Articles non traités" },
        processedItems: { en: "Processed Items", de: "Bearbeitete Artikel", fr: "Articles traités" },
        archiveAll: { en: "Archive all articles", de: "Alle Artikel archivieren", fr: "Archiver tous les articles" },
        unarchiveAll: { en: "Unarchive all articles", de: "Alle Artikel dearchivieren", fr: "Désarchiver tous les articles" },
        itemNr:     { en: "Item Nr.", de: "Artikel-Nr.", fr: "Numéro d'article" },
        description: { en: "Description", de: "Bezeichnung", fr: "Désignation" },
        netto:      { en: "Net", de: "Netto", fr: "Net" },
        quantity:   { en: "Quantity", de: "Menge", fr: "Quantité" },
        archive:    { en: "Archive", de: "Archivieren", fr: "Archiver" },
        unarchive:  { en: "Unarchive", de: "Dearchivieren", fr: "Désarchiver" },

        // layout
        logout:     { en: "Logout", de: "Abmelden", fr: "Déconnecter" },
        orders:     { en: "Orders", de: "Bestellungen", fr: "Ordres" }
    };

    function i18n(language) {

        var prefix = "%";

        function translate(target) {
            var key = target.attr("data-i18n");
            var missing = prefix + key + prefix;

            // if there is a translation for this key
            if (translations && translations[key]) {
                var text = translations[key][language] || (missing);
                target.text(text);
            }
            else {
                if (!target.text()) {
                    target.text(missing) ;
                }
            }
        }

        $("[data-i18n]").each(function() {
            translate($(this));
        });

        $("[data-i18n]", self.dom).each(function() {
            translate($(this));
        });
    }


    return init;

});

