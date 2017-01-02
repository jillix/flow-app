"use strict"

const API = require('flow-api/lib/cayley_get');
const connect = require('flow-api').connect;
const flow_streams = require('flow-streams');
const state = {};

connect(state, 'http://localhost:64210');

module.exports = (entrypoint_name, cb) => {

    const entrypoint = {
        env: {
            role: '_:3389dae361af79b04c9c8e7057f60cc6'
        } 
    };

    let chunk = {r: API.adapter(state.g, entrypoint_name)};

    // combine json object streams
    chunk = flow_streams.combine(null, null, {r: 'r'}, chunk);

    // parse cayley http response streams
    chunk = flow_streams.json.parse(null, null, {r: 'result.*'}, chunk);

    chunk.r.on('data', triple => {
        switch (triple.predicate) {
            case '<http://schema.jillix.net/vocab/sequence>':
                entrypoint.sequence = triple.id;
                break;
            case '<http://schema.jillix.net/vocab/environment>':
                Object.assign(entrypoint.env, JSON.parse(triple.id));
                break;
        }
    });

    chunk.r.on('error', (error) => {throw new Error(error)});

    chunk.r.on('end', () => {

        if (!entrypoint.sequence) {
            throw new Error('Flow-nodejs: No sequence defined in entrypoint.');
        }

        cb(entrypoint);
    });
};
