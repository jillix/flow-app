'use strict'

const Readable = require('stream').Readable;

module.exports = (array) => {

    // source
    let count = -1;
    let source = () => {
        if (++count === array.length) {
            stream.push(null);
        } else if (stream.push(array[count])) {
            source();
        }
    };

    let stream = new Readable({
        objectMode: true,
        read: source
    }); 

    return stream;
};
