// extend Object prototype with clone function
Object.defineProperty(Object.prototype, "clone", {
    value: function(){
        function ClonedObject(){}
        ClonedObject.prototype = this;
        return new ClonedObject();
    }
});

// object with a merge function
Object.defineProperty(Object.prototype, "merge", {
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
