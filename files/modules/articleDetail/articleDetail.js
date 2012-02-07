this.init = function( config ){
	
	//get dom refs
	var self = this,
		show = N.dom.findOne( config.show, this.inst.dom ),
		hide = N.dom.findOne( config.hide, this.inst.dom ),
		back = N.dom.findOne( config.back, this.inst.dom ),
		number = N.dom.findOne( config.number, this.inst.dom ),
		fields = {},
		cartData = {};
		
	if( config.fields ) for( var field in config.fields ) {
		
		fields[ field ] = config.fields[ field ];
		
		if( config.fields[ field ].selector ) {
			
			config.fields[ field ].selector = N.dom.find( config.fields[ field ].selector, this.inst.dom );
		}
	}
	
	this.obs.l( "showDetail", function( data ) {
		
		cartData = data;
		
		hide.style.display = "none";
		show.style.display = "block";
		
		//reset number value
		number.value = 1;
		
		//fill data
		self.bind( fields, data );
	});
	
	if( config.hideEvent ) this.inst.obs.l( config.hideEvent, function() {
		
		show.style.display = "none";
		hide.style.display = "block";
	});
	
	back.bind( "click", function( ) {
		
		show.style.display = "none";
		hide.style.display = "block";
	});
	
	//add to cart event
	if( config.addToCart && this.inst[ config.addToCart.view ] ) {
		
		var btn = N.dom.findOne( config.addToCart.selector, this.inst.dom );
		
		if( btn ) btn.bind( config.addToCart.event || "click", function(){
			
			cartData.number = parseInt( number.value, 10 ) || 1;
			
			self.inst[ config.addToCart.view ].obs.f( config.addToCart.fire, cartData );
			
			number.value = 1;
		});
	}
}