define(["./jquery.min"], function() {

    var items = null;
    var config = {
        label: function(item) {
            return item._c;
        }
    };

    function init() {

        var ul = $("#" + this.miid).find(".list");
        var branches = $("select[name='customer.branch']");

        // get the branch list
        this.link("getBranches", function(err, results) {

            items = results;
            branches.empty();

            for (var i in items) {
                branches.append("<option value='" + items[i].short + "'>" + items[i].companyName + "</option>");
            }
        });

        // get the user list
        this.link("getOrders", function(err, results) {

            items = results;
            ul.empty();

            for (var i in items) {
                ul.append("<li>" + config.label(items[i]) + "</li>");
            }
        });
    }

    return {
        init: init    
    };

var nav = {

    /**
        inits cnr list
        @author: faeb187
    */
    init: function(){

        var self = this,
            $nav = $( '#nav' );

        //reference to list
        self.$ul = $( '.list', $nav );

        //search
        $( '.search > input', $nav ).keyup( function(){

            var cnrs = [];

            //search field empty
            if( !this.value ) cnrs = self.cnrs.slice( 0 );

            else for( var i = 0, l = self.cnrs.length; i < l; ++i ){

                var cnr = self.cnrs[ i ];

                if( cnr.indexOf( this.value ) > -1 )

                    cnrs.push( cnr );
            }

            self.update( cnrs );
        });

        //html5 'x' in search field has no event yet
        $( '.search > input', $nav ).click( function(){

            $( this ).trigger( "keyup" );
        });

        //click event for list items
        $( 'li', self.$ul ).live( "click", function( e ){

            e.stopPropagation();

            var li = this;
            details.update( this.innerHTML );

            $( '.selected', li.parentNode ).removeClass( "selected" );
            $( li ).addClass( "selected" );
        });

        //click outside list element
        $nav.click( function(){

            details.reset();
            $( 'li', $nav ).removeClass( "selected" );
        });

        self.cnrs = [];

        // get the user list
        N.link({ url: "/3" }, function(err, results) {

            for (var i in results) {

                if (!results[i].system || !results[i].system.cnr) {
                    continue;
                }

                self.cnrs.push(results[i].system.cnr);
            }

            // show list
            self.update(self.cnrs);
        });

    },

    /**
        updates cnr list
        @author: faeb187
    */
    update: function(cnrs){

        this.$ul.empty();

        for (var i in cnrs) {
            this.$ul.append( "<li>" + cnrs[i] + "</li>" );
        }
    }
};

return nav;

});

