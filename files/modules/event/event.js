this.init = function( events ) {
	
	if( events ) for( var i=0, l=events.length; i<l; ++i ) {
		
		var item = N.dom.findOne( events[ i ].selector, this.inst.dom );
		
		if( item ) item.bind( events[ i ].event || "click", (function( obs, name, item, args ) {
			
			if( events[ i ].logout ) return function(){
				
				N.logout(function( err ) {
					
					if( !err ) N.comp( "body" );
				});
			}
			
			else return function() {
			
				obs.f( name, item, args );
			}
			
		})( this.inst[ events[ i ].view ].obs || this.inst.obs, events[ i ].fire, item, events[ i ].args ));
	}
};