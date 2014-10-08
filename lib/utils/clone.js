// clone objects
module.exports = function(object){
    function ClonedObject(){}
    ClonedObject.prototype = object;
    return new ClonedObject();
};
