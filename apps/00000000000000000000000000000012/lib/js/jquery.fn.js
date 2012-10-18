/**
	returns formatted date
	@author: faeb187
*/
Date.prototype.dmY = function(){

	var d = this.getDate(),
		m = this.getMonth() + 1,
		y = this.getFullYear();

	return ( d < 10 ? "0" + d : d ) + "." +
		( m < 10 ? "0" + m : m ) + "." + y;
}