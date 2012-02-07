define(function(){
	
	//dom refs
	var cssNS						= "div.adminMain ",
		leftTopBarUsers				= N.dom.findOne( cssNS + "#itemsLeft>ul.bar.top>#users" ),
		leftTopBarRoles				= N.dom.findOne( cssNS + "#itemsLeft>ul.bar.top>#roles" ),
		leftTopBarOperations		= N.dom.findOne( cssNS + "#itemsLeft>ul.bar.top>#operations" ),
		leftTopBarModules			= N.dom.findOne( cssNS + "#itemsLeft>ul.bar.top>#modules" ),
		leftSecondBarSearch			= N.dom.findOne( cssNS + "#itemsLeft>ul.bar.second>ul>li.search>input" ),
		leftBottomBarAddItem		= N.dom.findOne(),
		leftBottomBarRemoveItem		= N.dom.findOne(),
		leftBottomBarPagePlus		= N.dom.findOne(),
		leftBottomBarPageMinus		= N.dom.findOne(),
		leftBottomBarPageNumber		= N.dom.findOne(),
		detailCancel				= N.dom.findOne(),
		rightTopBarSearch			= N.dom.findOne(),
		rightBottomBarAddItem		= N.dom.findOne(),
		rightBottomBarRemoveItem	= N.dom.findOne(),
		rightBottomBarPagePlus		= N.dom.findOne(),
		rightBottomBarPageMinus		= N.dom.findOne(),
		rightBottomBarPageNumber	= N.dom.findOne();
	
	return {
		
		name: "adminMain",
		init: function( config ){
			
			console.log( config );
		}
	}
});