this.init = function( config ){
	
	var self = this,
		orderDetail		= N.dom.findOne( "#orderDetail", this.inst.dom ),
		noItemSelected	= N.dom.findOne( "#noItmSel", this.inst.dom ),
		back			= N.dom.findOne( "#orderDetailCancel", this.inst.dom ),
		save			= N.dom.findOne( "#orderDetailArchive", this.inst.dom ),
		unarchive		= N.dom.findOne( "#orderDetailUnarchive", this.inst.dom ),
		time			= N.dom.findOne( "#orderTime", this.inst.dom ),
		orderNr			= N.dom.findOne( "#orderNr", this.inst.dom ),
		total			= N.dom.findOne( "#orderTotal", this.inst.dom ),
		company			= N.dom.findOne( "#orderCompany", this.inst.dom ),
		name			= N.dom.findOne( "#orderName", this.inst.dom ),
		zip				= N.dom.findOne( "#orderZip", this.inst.dom ),
		city			= N.dom.findOne( "#orderCity", this.inst.dom ),
		cnr				= N.dom.findOne( "#orderCnr", this.inst.dom ),
		branch			= N.dom.findOne( "#orderBranch", this.inst.dom ),
		archive			= N.dom.findOne( "#archive", this.inst.dom ),
		itemInArchive	= 0,
		_c,
		hide = function(){
			
			orderDetail.style.display = "none";
			noItemSelected.style.display = "block";
		
			itemInArchive = 0;
		};
	
	this.obs.l( "showOrder", function( data ){
		
		if( data.items ) self.render( data.items, 1 );
		
		orderNr.innerHTML = _c = data._c || "";
		time.innerHTML = data.time || "";
		
		total.innerHTML = ( data.total || 0 ).toFixed( 2 );
		
		//archive
		if( data.archive ) {
			
			itemInArchive = 1;
			unarchive.style.display = "inline";
			save.style.display = "none";
		}
		else {
			
			itemInArchive = 0;
			unarchive.style.display = "none";
			save.style.display = "inline";
		}
		
		archive.innerHTML = data.archiveTime || "–";
		
		//adress
		company.innerHTML = data.adress.company || "–";
		name.innerHTML = data.adress.name || "–";
		zip.innerHTML = data.adress.zip || "–";
		city.innerHTML = data.adress.city || "–";
		
		//customer
		cnr.innerHTML = data.customer.cnr || "–";
		branch.innerHTML = data.customer.branch || "–";
		
		noItemSelected.style.display = "none";
		orderDetail.style.display = "block";
	});
	
	back.bind( "click", hide );
	
	save.bind( "click", function(){
		
		if( !itemInArchive ) N.link({ url: "/archive", data: { _c: _c } }, function( err ){
			
			if( err ) alert( err );
			
			hide();
			
			self.inst.orders.obs.f( "listLoadData" );
		});
	});
	
	unarchive.bind( "click", function(){
		
		if( itemInArchive ) N.link({ url: "/unarchive", data: { _c: _c } }, function( err ){
			
			if( err ) alert( err );
			
			hide();
			
			self.inst.orders.obs.f( "listLoadData" );
		});
	});
};