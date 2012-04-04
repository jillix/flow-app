define(function() {

var history = {

	/**
		inits hp history
		@author: faeb187
	*/
	init: function(){
	
		//show/hide undo 'x'
		$( '#history .list > li' ).live({
		
			mouseenter: function(){
			
				$( 'ul > li:last-child', this ).not( ".th" ).show();
			},
			mouseleave: function(){
			
				$( 'ul > li:last-child', this ).not( ".th" ).hide();
			}
		});
		
		//undo history
		$( '#history .undo' ).live( "click", function(){
		
			//REQUEST
			details.users[ $( '#nav > .selected' ).text() ].hp = this.undoVal;
			
			$( '#hp' ).text( this.undoVal );
			
			$( this.parentNode ).remove();
		});
	},
	
	/**
		updates hp history
		@author: faeb187
	*/
	update: function( opt ){
		
		if( !opt || opt.usr ) return;
		
		var uh = opt.usr.history,
			$h1 = $( '#history > h1' );
		
		//add entry to history
		if( opt.mode && opt.hp && opt.hpNew ){
		
			var d = new Date();
			
			uh.push([
			
				d.getDate() + "." +
					( d.getMonth() + 1 ) + "." +
					d.getFullYear(),
					
				d.getHours() + ":" + d.getMinutes(),
					
				opt.mode,
				opt.hp,
				opt.hpNew,
				opt.undoVal
			]);
		}
		
		//update history view
		var $h = $( '#history > .list' ).empty();
		
		if( uh.length ){
		
			for( var i = uh.length - 1; i >= 0; --i ){
		
				var h = uh[ i ];
		
				if( i == uh.length - 1 )
				
					$h.append(
				
						"<li>" +
							"<ul>" +
								"<li class='th'>Date</li>" +
								"<li class='th'>Time</li>" +
								"<li class='th'>Operation</li>" +
								"<li class='th'>Value</li>" +
								"<li class='th'>HP</li>" +
							"</ul>" +
						"</li>"
						
					);
					
					$h.append(
			
						"<li>" +
							"<ul>" +
								"<li>" + h[ 0 ] + "</li>" +
								"<li>" + h[ 1 ] + "</li>" +
								"<li>" + h[ 2 ].toUpperCase() + "</li>" +
								"<li>" + h[ 3 ] + "</li>" +
								"<li>" + h[ 4 ] + "</li>" +
								"<li class='undo' undoVal='" + h[ 5 ] + "'>x</li>" +
							"</ul>" +
						"</li>"
					);
			}
			
			$h1.show();
		}
		
		else $h1.hide()
	}
};

return history;

});

