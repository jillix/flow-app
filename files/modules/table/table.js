this.init = function( config ) {
    
    var view = this,
    	table = N.dom.findOne( config.table, view.inst.dom ),
    	loader = N.dom.findOne( config.loader, view.inst.dom );
    
    //filter
    view.obs.l( "filterActive", function( item ) {
    
        item.addAttr({ "class": "active" });
    });
    view.obs.l( "filterInactive", function( item ) {
        
        item.remAttr({ "class": "active" });
    });
    
    //sorting
    view.obs.l( "sortStart", function( item ) {
        
        item.remAttr({ "class": "asc desc nosort" });
    });
    view.obs.l( "sortAsc", function( item ) {
        
        item.addAttr({ "class": "asc" });
    });
    view.obs.l( "sortDesc", function( item ) {
        
        item.addAttr({ "class": "desc" });
    });
    view.obs.l( "noSort", function( item ) {
        
        item.addAttr({ "class": "nosort" });
    });
    
    //saving
    view.inst.obs.l( "formSubmit", function(){
        
        view.find();
    });
    
    //custom view event-interface
    view.obs.l( "tableLoadData", function( data, queryPattern ) {
        
        var find = {};
        
        if( data && data._c && queryPattern ) {
            
            for( var key in queryPattern ) {
                
                if( data[ queryPattern[ key ] ] ) find[ key ] = data[ queryPattern[ key ] ];
            }
        }
        
        view.find( find );
    });
    
    view.obs.l( "itemHandler", function( item ){
        
        item.bind( "click", function() {
            
            for( var key in view.index ) {
                
                view.index[ key ].remAttr({ "class": "active" });
            }
            
            item.addAttr({ "class": "active" });
        });
    });
    
    view.obs.l( "findStart", function(){
    	
    	if( table ) table.style.display = "none";
    	if( loader ) loader.style.display = "block";
    });
    
    view.obs.l( "findDone", function(){
    	
    	if( table ) table.style.display = "block";
    	if( loader ) loader.style.display = "none";
    });
};