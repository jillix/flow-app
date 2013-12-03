// extend Object prototype with clone function
Object.defineProperty(Object.prototype, "clone", {
    value: function(){
        function ClonedObject(){}
        ClonedObject.prototype = this;
        return new ClonedObject();
    }
});

// blend objects together
Object.defineProperty(Object.prototype, "blend", {
    value: function(object, overwrite){
        for (var property in object) {
            if (object.hasOwnProperty(property)) {
                if (!overwrite && typeof this[property] !== 'undefined') {
                    continue;
                }
                
                this[property] = object[property];
            }
        }
    }
});
