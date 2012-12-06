/*
    cell:
    - array with links to other cells (axon) => property of a document/object
    - diffrent types of cells => mongodb collections
    - instances of cell types => documents/objects
*/

// indexes
db.cell.ensureIndex({'_axon.id': 1});
db.cell.ensureIndex({'_axon.type': 1});

// sample object
var cell = {
    "_id"   : "MongoDBID",      // cell instance id
    "_axon" : [ciid, ciid, ..]  // axon, dendrites
    // ..additional data
};

var ciid = {
    id: ObjectId(""),
    type: "typeName" 
}