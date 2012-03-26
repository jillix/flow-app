define(["./history"], function(history) {

var details = {

	users: {
	
		'55132': {
			
			cnr: "55132",
			customer: "Will Smith",
			hp: 500,
			history: []
		},
		
		'13523': {
		
			cnr: "13523",
			customer: "Tupac Shakur",
			hp: 500,
			history: []
		},
		
		'24536': {
		
			cnr: "24536",
			customer: "Jennifer Lopez",
			hp: 500,
			history: []
		},
		
		'43534': {
		
			cnr: "43534",
			customer: "Michael Schuhmacher",
			hp: 500,
			history: []
		},
		
		'24522': {
		
			cnr: "24522",
			customer: "Jenna Haze",
			hp: 500,
			history: []
		},
		
		'45223': {
		
			cnr: "45223",
			customer: "Roger Federer",
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
	
		//REQUEST
		var usr = this.users[ cnr ];
				
		$( '.cnr' ).text( usr.cnr );
		$( '.customer' ).text( usr.customer );
		$( '#hp' ).text( usr.hp );
		
		$( '.jxdetail > .detail' ).show();
		
		history.update({
		
			usr: usr
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

