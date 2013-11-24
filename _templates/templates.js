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
        proxy: '52923d79ea5c6526b8870cdd'
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
        roles: {},
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
        roles: {},
        schema: {
            name: {
                type: 'string',
                required: true
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
        roles: {},
        schema: {
            name: {
                type: 'string',
                required: true
            }
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
        roles: {},
        schema: {
            miid: {
                type: 'string',
                required: true
            }
        }
    }
};

var roles = {
    proxy: {
        _id: ids.roles.proxy,
        _tp: [/*Add template id*/],
        name: 'mono_proxy'
    },
    admin: {
        _id: ids.roles.proxy,
        _tp: [/*Add template id*/],
        name: 'mono_admin'
    },
    user: {
        _id: ids.roles.proxy,
        _tp: [/*Add template id*/],
        name: 'mono_user'
    }
};