'use strict'

const Readable = require('stream').Readable;

module.exports = (array) => {

    // source
    let count = -1;
    let source = () => {

        if (!stream.array) {
            stream.pause();
            return;
        }

        if (++count === stream.array.length) {
            stream.push(null);
        } else if (stream.push(stream.array[count])) {
            source();
        }
    };

    let stream = new Readable({
        objectMode: true,
        read: source
    });

    if (array) {
        stream.array = array;
    }

    stream.set = (array) => {
        stream.array = array;
        stream.resume();
        source();
    };

    stream.pause();

    return stream;
};
