"use strict"

module.exports = (store, entrypoint_name, cb) => {

    const entrypoint = {
        env: {
            role: '_:3389dae361af79b04c9c8e7057f60cc6'
        } 
    };

    const stream = store.entrypoint(entrypoint_name);

    stream.on('data', (triple) => {
        switch (triple[1]) {
            case '<http://schema.jillix.net/vocab/sequence>':
                entrypoint.sequence = triple[2];
                break;
            case '<http://schema.jillix.net/vocab/environment>':
                Object.assign(entrypoint.env, JSON.parse(triple[2]));
                break;
        }
    });

    stream.on('error', (error) => {
        throw new Error(error)
    });

    stream.on('end', () => {

        if (!entrypoint.sequence) {
            throw new Error('Flow-nodejs: No sequence defined in entrypoint.');
        }

        cb(entrypoint);
    });
};
