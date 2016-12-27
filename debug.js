#!/usr/bin/env node

const resolve = require('path').resolve;
const Flow = require(__dirname + '/node_modules/flow');
const Adapter = require(__dirname + '/lib/adapter');
const Entrypoint = require(__dirname + '/lib/entrypoint');
const entrypoint_name = process.argv[2];
const base_path = resolve(process.argv[3] || '.');

/* DEBUG CODE ----------------------------------------------------------- */
const readline = require('readline');
const numCPUs = require('os').cpus().length;

/*function formatBytes (value) {
    if (value > 999999)  {
        return value / 1000000 + 'Mb';
    }

    if (value < 1000000 && value > 1000) {
        return value / 1000 + 'Kb';
    }

    return value + 'b';
}

console.log('CPUs:   ' + numCPUs);
const memStats = setInterval(() => {
    let line = 'Memory: ' + formatBytes(process.memoryUsage().rss) + '\n';
    process.stdout.write(line);
    readline.moveCursor(process.stdin, line.length * -1, -1);
}, 500);*/

function nextChunk (stream, count, max) {
    return (chunk) => {
        if (++count < max) {
            process.nextTick(stream.write, chunk);
        } else {
            stream.end();
        }
    };
}
/* --------------------------------------------------------------------- */

!entrypoint_name && error('Missing entrypoint argument.');
Entrypoint(entrypoint_name, entrypoint => {

    entrypoint.base = base_path;

    let flow = Flow(entrypoint.env, Adapter(entrypoint))(entrypoint.sequence);
    flow.on('data', nextChunk(flow, 0, 1000));
    flow.on('error', error => process.stderr.write(error.stack.toString() + '\n'));
    flow.on('ready', () => {
        console.time('Time');
        process.nextTick(flow.write, {object: 'value'});
    });
    flow.on('end', () => console.timeEnd('Time'));
});
