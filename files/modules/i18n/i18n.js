/*
	name is mandatory
*/
define(function(){

	return {
	
		name: "i18n",
		
		init: function( view, config ){
			
			console.log( config );
			
			var self = this;
			
			if( config && config.locales ) for( var locale in config.locales ) {
				
				var item = N.dom.find( config.locales[ locale ], this.inst.dom );
				
				if( item.length ) for( var i=0, l=item.length; i<l; ++i ) {
					
					item[ i ].bind( "click", (function( locale ){
					
						return function(){
							
							if( locale != N.locale ) {
								
								N.locale = locale;
								self.find();
								self.inst.obs.f( "localeChange", locale );
							}
						}
						
					})( locale ));
				}
			}
		}
	};
});