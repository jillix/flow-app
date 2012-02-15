var send = require(process.env.ROOT + "/core/send").send,
    Nscript	= process.env.DEV ? "N.dev.js" : "N.js",
	Rscript = process.env.DEV ? "require.dev.js" : "require.js";

this.route = function(link) {
    
    var compID = 5; //temp
    
    //set headers
	link.res.headers['content-style-type'] = "text/css";
	link.res.headers['content-type']       = "text/html; charset=utf-8";
	
	send.ok(
	   
	   link.res,
	   "<!DOCTYPE html><html><head>"+
	   "<script data-main='"+ CONFIG.operationKey +"/getModule/N/"+ Nscript +"' src='"+ CONFIG.operationKey +"/getModule/"+ Rscript +"'></script>"+
	   "<script type='text/javascript'>"+
	       "N.ok='/"+ CONFIG.operationKey +"'"+
	       "window.onload=function(){N.comp('body','"+ compID +"')}"+
	   "</script>"+
	   "</head><body></body></html>"
    );
}