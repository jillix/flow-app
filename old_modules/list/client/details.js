define(["./history"], function(history) {

var details = {

    users: {

        '12268': {

            cnr: "12268",
            customer: "Will Smith",
            hp: 500,
            history: []
        }
    },

    /**
        inits detail view
        @author: faeb187
    */
    init: function(){

        var self = this;

        //add hp button
        $( '#addHP' ).click( function(){

            $( '#inpAddHP' ).show();
        });

        //make hp editable
        $( '#hp' ).live( "click", function(){

            var lab = this,
                $inp = $( '<input/>',{

                    id: "inpSetHP",
                    'class': "right",
                    type: "number",
                    value: lab.innerHTML

                }).css( "width", ( parseInt( $( lab ).css( "width" ) ) + 30 ) + "px" );

            $( lab ).replaceWith( $inp );

            $( '#addHP' ).hide();

            $inp.focus().select();
        });

        //set/add hp
        $( '#inpAddHP, #inpSetHP' ).live( "keypress", function( e ){

            if( e.which != 13 ) return;

            var inp = this,
                add = inp.id == "inpAddHP" ? 1 : 0,
                usr = self.users[ $( '.selected' ).text() ],
                val = parseInt( inp.value ),
                addedVal = usr.hp += val,
                hpNew = add ? addedVal : val;

            if( add ){

                $( '#hp' ).text( hpNew );
                $( inp ).hide();
            }

            else {

                var $lab = $( '<label/>',{

                    id: "hp",
                    'class': inp.className + " editable"

                }).text( val );

                $( inp ).replaceWith( $lab );
            }

            $( '#addHP' ).show();

            //add entry to history
            history.update({

                usr: usr,
                mode: add ? "add" : "set",
                hp: val,
                hpNew: hpNew,
                undoVal: usr.hp
            });

            //REQUEST
            //save hp
            usr.hp = hpNew;
        });
    },

    /**
        updates detail view
        @author: faeb187
    */
    update: function( cnr ){

        // get the user details
        N.link({ url: "/3/" + cnr }, function(err, usr) {

            $( '.cnr' ).text( usr.system.cnr );

            var workAddr = usr.adress.work,
                customer = [];

            for (var key in workAddr) {
                customer.push(workAddr[key]);
            }
            customer = customer.join(", ");
            customer === "" ? "unknown" : customer;

            $( '.customer' ).text( customer );
            $( '#hp' ).text( usr.happybonus ? usr.happybonus.points : "No HB!" );
            $( '.jxdetail > .detail' ).show();

            // now show the user happy bonus history
            history.update({ usr: usr });
        });

    },

    /**
        resets detail view
        @author: faeb187
    */
    reset: function(){

        $( '.jxdetail > .detail' ).hide();
    }
};

return details;

});

