jillix Web Framework

Installation
========

```
npm install
```

This should install the OrientDB server in the `bin` directory and the mono databae form the `admin/scripts/orientdb` directory.

Start the mono server with:

```
node server.js
```

Now make sure you have `mono.ch` in your `/etc/hosts` pointing to `127.0.0.1`. In your browser open `mono.ch:8000` for the admin interface component or `mono.ch:8000/stdl` for the standard library component.