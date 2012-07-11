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
            if (items[i].readonly) {
                itemRow.find("[type='checkbox']").hide();
            }

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
        branch: { en: "Branch", de: "Filiale", fr: "Succursale", it: "Filiale" },
        show:   { en: "Show", de: "Zeige", fr: "Voir" },
        all:    { en: "All", de: "Alle", fr: "Tous", it: "Tutto" },
        "new":    { en: "New", de: "Neu", fr: "Nouveaux", it: "Nuovi" },
        archived: { en: "Archived", de: "Archiviert", fr: "Archivés", it: "Archiviati" },

        // details
        hbInfoText: { en: "Bitte Warenkorb erstellen und den Betrag mit der Artikel-Nr. GU HAPPY BONUS wieder gutschreiben", de: "Bitte Warenkorb erstellen und den Betrag mit der Artikel-Nr. GU HAPPY BONUS wieder gutschreiben", fr: "Veuillez générer un panier et créditer le montant en retour avec le numéro d'article GU HAPPY BONUS.", it: "Si prega di creare un carrello e di riaccreditare l'importo con il n. di articolo GU HAPPY BONUS" },
        orderNr:    { en: "Order No.", de: "Bestellnummer", fr: "Numéro de commande", it: "No. ordine" },
        orderDate:  { en: "Order Date", de: "Bestelldatum", fr: "Date de commande", it: "Dati per l'ordinazione" },
        customer:   { en: "Customer", de: "Kunde", fr: "Client", it: "Cliente" },
        company:    { en: "Company", de: "Firma", fr: "Entreprise", it: "Firma" },
        name:       { en: "Name", de: "Name", fr: "Nom", it: "Nome" },
        zip:        { en: "ZIP", de: "PLZ", fr: "ZIP", it: "ZIP" },
        city:       { en: "City", de: "Ort", fr: "Ville", it: "Citta" },
        customerNo: { en: "Customer No.", de: "Kunden-Nr.", fr: "Numéro de client", it: "Numero cliente" },
        moreInfo:   { en: "For the attention of", de: "Zu Handen von", fr: "À l'attention de", it: "Per" },
        unprocessedItems: { en: "Unprocessed Items", de: "Unbearbeitete Artikel", fr: "Articles non traités", it: "Articoli non processati" },
        processedItems: { en: "Processed Items", de: "Bearbeitete Artikel", fr: "Articles traités", it: "Articoli processati" },
        archiveAll: { en: "Archive all articles", de: "Alle Artikel archivieren", fr: "Archiver tous les articles", it: "Archiviare tutti gli articoli" },
        unarchiveAll: { en: "Unarchive all articles", de: "Alle Artikel dearchivieren", fr: "Désarchiver tous les articles", it: "Disarchiviare tutti gli articoli!" },
        itemNr:     { en: "Item Nr.", de: "Artikel-Nr.", fr: "Numéro d'article", it: "Numero articolo" },
        description: { en: "Description", de: "Bezeichnung", fr: "Désignation", it: "Descrizione" },
        netto:      { en: "Net", de: "Netto", fr: "Net", it: "Netto" },
        quantity:   { en: "Quantity", de: "Menge", fr: "Quantité", it: "Quantità" },
        archive:    { en: "Archive", de: "Archivieren", fr: "Archiver", it: "Archiviare" },
        unarchive:  { en: "Unarchive", de: "Dearchivieren", fr: "Désarchiver", it: "Disarchiviare" },

        // layout
        logout:     { en: "Logout", de: "Abmelden", fr: "Déconnecter", it: "Logout" },
        orders:     { en: "Orders", de: "Bestellungen", fr: "Ordres", it: "Ordini" }
    };

    function i18n(language) {
language = "it";
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

