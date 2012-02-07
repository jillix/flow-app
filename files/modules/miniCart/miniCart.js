this.init = function( config ){
	
	var self = this,
		content		= N.dom.findOne( config.items,	self.inst.dom ),
		empty		= N.dom.findOne( config.empty,	self.inst.dom ),
		thanks		= N.dom.findOne( config.thanks,	self.inst.dom ),
		totalRef	= N.dom.findOne( config.total,	self.inst.dom ),
		btnOrder	= N.dom.findOne( config.order,	self.inst.dom ),
		agbCheck	= N.dom.findOne( config.agb,	self.inst.dom ),
		items = [],
		order = {},
		total = 0,
		timerID;
	
	this.obs.l( "addItem", function( data ) {
		
		if( data.number ) {
		
			if( !order[ data._c ] ) {
				
				if( timerID ) clearTimeout( timerID );
				
				order[ data._c ] = {};
				for( var key in data ) order[ data._c ][ key ] = data[ key ];
				
				//show
				content.style.display = "block";
				
				//hide
				empty.style.display = "none";
				thanks.style.display = "none";
			}
			else order[ data._c ].number += parseInt( data.number, 10 ) || 1;
			
			//add to total
			self.obs.f( "updateTotal", data );
		}
	});
	
	this.obs.l( "renderItems", function(){
		
		self.render( items, 1 );
	});
	
	//remove item
	this.obs.l( "remItem", function( data ) {
		
		if( order[ data._c ] ) delete order[ data._c ];
		
		self.obs.f( "updateTotal", data );
		
		if( items.length < 1 ) {
			
		    //show
		    empty.style.display = "block";
		    
		    //hide
		    content.style.display = "none";
		    thanks.style.display = "none";
		    
		    agbCheck.remAttr({ "class": "active" });
			btnOrder.addAttr({ "class": "inactive" });
		}
		self.obs.f( "renderItems" );
	});
	
	//update total
	this.obs.l( "updateTotal", function( data, value, item ) {
		
		if( order[ data._c ] ) {
		
			if( !item ) item = {};
			
			value = parseInt( item.value || order[ data._c ].number, 10 ) || "";
			
			//check if article is still in stock
			if( value > order[ data._c ].stock ) {
				
				item.value = order[ data._c ].number = order[ data._c ].stock;
			}
			else {
				
				item.value = value;
				order[ data._c ].number = value || 1;
			}
		}
		
		//update total
		total = 0;
		items = [];
		
		for( var cid in order ) {
		    
		    total += order[ cid ].number * order[ cid ].netto;
		    items.push( order[ cid ] );
		}
		
		totalRef.innerHTML = total.toFixed( 2 );
		
		self.obs.f( "renderItems" );
	});
	
	//order
	if( btnOrder ) btnOrder.bind( "click", function() {
		
		if( agbCheck && agbCheck.getAttribute( "class" ).indexOf( "active" ) > -1 ) {
			
			//save order
			var send = { total: total, items: [] };
			
			for( var key in order ) {
				
				send.items.push({
					
					_c:			order[ key ]._c,
					caption:	order[ key ].caption,
					netto:		order[ key ].netto,
					nr:			order[ key ].nr,
					stock:		order[ key ].stock,
					number:		order[ key ].number
				});
			}
			
			N.link({ url: "/order", data: send }, function( err ) {
				
				if( err ) alert( "Error" );
				
				items = [];
				order = {};
				total = 0;
				
				//show
		    	thanks.style.display = "block";
		    	
		    	//hide
		    	content.style.display = "none";
		    	empty.style.display = "none";
		    	
		    	agbCheck.remAttr({ "class": "active" });
				btnOrder.addAttr({ "class": "inactive" });
				
				timerID = setTimeout(function(){
					
					//show
					empty.style.display = "block";
		    		
		    		//hide
		    		thanks.style.display = "none";
					
				}, 8888 );
			});
		}
	});
	
	if( agbCheck ) agbCheck.bind( "click", function( ) {
		
		if( agbCheck.getAttribute( "class" ).indexOf( "active" ) > -1 ) {
			
			agbCheck.remAttr({ "class": "active" });
			btnOrder.addAttr({ "class": "inactive" });
		}
		else {
			
			agbCheck.addAttr({ "class": "active" });
			btnOrder.remAttr({ "class": "inactive" });
		}
	});
};