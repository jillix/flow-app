var KNOWN_APPS = {
    // MonoDev
    '00000000000000000000000000000002': {
        alias: ['monodev', 'md'],
        repo: 'git@github.com:jillix/MonoDev.git'
    },
    // DMS apps
    'cc36hf78HGT965HgtB96KJyg9dfGHtgV': {
        alias: ['cctool', 'cc'],
        repo: 'git@bitbucket.org:jillix/cctool.git'
    },
    'dms30dksd36V0a5PRPzXHgE49J5HlfHF': {
        alias: ['dms'],
        repo: 'git@bitbucket.org:jillix/dms.git'
    },
    'crm6hf78HGT965HgtB96KJyg9dfGHtgV': {
        alias: ['crm'],
        repo: 'git@bitbucket.org:jillix/crm.git'
    },
    'not-known-yet': {
        alias: ['crm'],
        repo: 'git@bitbucket.org:jillix/crm.git'
    },
    // old apps
    '00000000000000000000000000000109': {
        alias: ['ladivina', 'ld'],
        repo: 'git@bitbucket.org:jillix/ladivina.git'
    },
    '00000000000000000000000000000100': {
        alias: ['partnerlogin', 'pl'],
        repo: 'git@bitbucket.org:jillix/partnerlogin.git'
    },
    '00000000000000000000000000000108': {
        alias: ['salongenf', 'sg'],
        repo: 'git@bitbucket.org:jillix/salongenf.git'
    },
    '00000000000000000000000000000101': {
        alias: ['aktionshop', 'as'],
        repo: 'git@bitbucket.org:jillix/aktionshop.git'
    },
    '00000000000000000000000000000051': {
        alias: ['liqshoporders', 'lo'],
        repo: 'git@bitbucket.org:jillix/liqshoporders.git'
    }
};

function find(app) {
    for (var i in KNOWN_APPS) {
        for (var a in KNOWN_APPS[i].alias) {
            if (KNOWN_APPS[i].alias[a] === app.toLowerCase()) {
                return { id: i, repo: KNOWN_APPS[i].repo };
            }
        }
    }
}

exports.KNOWN_APPS = KNOWN_APPS;
exports.find = find;

