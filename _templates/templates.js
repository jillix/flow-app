// mono core template ids
var dbName = 'mono';
var ids = {
    templates: {
        applications: '528f78dc197ef1c23714a04d',
        modules: '528f78f1197ef1c23714a04e',
        roles: '528f7902197ef1c23714a04f',
        miids: '52923eb6ea5c6526b8870cde'
    },
    roles: {
        server: '52923d79ea5c6526b8870cdd',
        admin: '52937f9a60e2eaea0c168196'
    }
};

// mono core templates
var templates = {
    applications: {
        _id: ids.templates.applications,
        _tp: [/*Add template id*/],
        db: dbName,
        collection: 'm_applications',
        name: 'm_applications',
        options: {
            label: 'Applications'
        },
        roles: {
            // mono server 'r'
            // mono admin 'crud'
        },
        itemAccess: true,
        schema: {
            name: {
                type: 'string',
                required: true
            },
            domains: [{
                type: 'string',
                required: true
            }],
            routes: {
                type: 'object',
                required: true
            },
            locale: {
                type: 'string',
                required: true
            },
            roles: {
                // example: {roleId: 'crud'}
                type: 'object',
                required: true
            },
            server: {
                host: {
                    type: 'string',
                    required: true
                },
                // port for http
                http: {
                    type: 'number',
                    required: true
                },
                // port for websockets
                ws: {
                    type: 'number',
                    required: true
                }
            },
            public: {
                role: {
                    type: 'objectid',
                    required: true
                },
                dir: {
                    type: 'string',
                    required: true
                }
                // this should be handled by modules
                /*,
                favicon: {
                    type: 'string'
                },
                title: {
                    type: 'string'
                }
                */
            }
        }
    },
    modules: {
        _id: ids.templates.modules,
        _tp: [/*Add template id*/],
        db: dbName,
        collection: 'm_modules',
        name: 'm_modules',
        options: {
            label: 'Modules'
        },
        roles: {
            // mono server 'r'
            // mono admin 'crud'
        },
        itemAccess: true, // ????? it could be a problem, that to many roles have access to a module
        schema: {
            name: {
                type: 'string',
                required: true
            },
            owner: {
                type: 'string',
                required: true
            },
            source: {
                type: 'string',
                required: true
            },
            roles: {
                // example: {roleId: 'crud'}
                type: 'object',
                required: true
            },
            versions: [{
                dependencies: {
                    type: 'array',
                    required: true,
                },
                operations: {
                    type: 'object'
                },
                version: {
                    type: 'string',
                    required: true
                }
            }]
        }
    },
    miids: {
        _id: ids.templates.miids,
        _tp: [/*Add template id*/],
        db: dbName,
        collection: 'm_miids',
        name: 'm_miids',
        options: {
            label: 'Module instances'
        },
        roles: {
            // mono server 'r'
            // mono admin 'crud'
        },
        itemAccess: true,
        schema: {
            miid: {
                type: 'string',
                required: true
            },
            module: {
                type: 'objectid',
                required: true
            },
            version: {
                type: 'string',
                required: true
            },
            roles: {
                // example: {roleId: 'crud'}
                type: 'object',
                required: true
            },
            config: {
                client: {
                    html: {
                        // example: 'path/to/file.html'
                        type: 'string'
                    },
                    css: {
                        // example: ['path/to/file.css']
                        type: 'array'
                    },
                    scripts: {
                        // example: ['path/to/file.js']
                        type: 'array'
                    },
                    waitFor: {
                        // example: ['miid_1', 'miid_n']
                        type: 'array'
                    },
                    modules: {
                        // example: {'#cssSelector': 'miid'}
                        type: 'object'
                    },
                    custom: {
                        type: 'object'
                    }
                },
                operations: [{
                    method: {
                        type: 'string',
                        required: true
                    },
                    config: {
                        type: 'object'
                    }
                }]
            }
        }
    },
    roles: {
        _id: ids.templates.roles,
        _tp: [/*Add template id*/],
        db: dbName,
        collection: 'm_roles',
        name: 'm_roles',
        options: {
            label: 'Roles'
        },
        roles: {
            // mono admin 'crud'
        },
        schema: {
            name: {
                type: 'string',
                required: true
            }
        }
    }
};

var roles = {
    server: {
        _id: ids.roles.server,
        _tp: [/*Add template id*/],
        name: 'mono_server'
    },
    admin: {
        _id: ids.roles.admin,
        _tp: [/*Add template id*/],
        name: 'mono_admin'
    }
};
