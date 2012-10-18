define([

	"../crm/lib/js/mod/crm_topbar",
	"../crm/lib/js/mod/crm_list",
	"../crm/lib/js/mod/crm_table",
	"../crm/lib/js/mod/crm_detail",
	"../crm/lib/js/mod/crm_user",
	"../crm/lib/js/mod/crm_import",
	"../crm/lib/js/mod/crm_settings"
	
], function(

	crm_topbar,
	crm_list,
	crm_table,
	crm_detail,
	crm_user,
	crm_import,
	crm_settings ){
	
		/**
			inits crm module
			@author: faeb187
		*/
		function init( c ){
			
			//init modules
			crm_topbar.call( this );
			crm_list.call( this );
			crm_table.call( this );
			crm_detail.call( this );
			crm_user.call( this );
			crm_import.call( this );
			crm_settings.call( this );
		};
	
		return init;
	});