#!/bin/bash

# go through all compositions and collect module names
# merge engine package config into instances

# create bundles with node_modules/module/client_bundle.js
# important create external bundles of the top level modules!!
# browserify -r view -o node_modules/view/M.js
# browserify --dg false (disable detecting of nodes global (process, ect.)) also for modules??
# compression example
# browserify lib/flow.client.js > M.js; ccjs M.js > _tmp.js; gzip -9c _tmp.js > M.js; rm _tmp.js
# watchify example with compression
# watchify lib/flow.client.js -vd -o 'gzip -9 > M.js'
# use source maps for debugging ?

# minify js in production mode
# minify css
# minify html
# compress files
