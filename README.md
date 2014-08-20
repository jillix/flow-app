# engine

## Installation

```sh
# create the folder that will contain the engine framework and admin application
# Supposing you are in this folder, run:
cd <your working directory>

export ENGINE_APPS=`echo $PWD` # <-- The output of `echo $PWD`
export ENGINE_DIR=$ENGINE_APPS/engine

# For a better experience, add the variables above in .basrch or .profile

# It's recommended to have absolute paths like /home/someone/... because they will be used
# in admin application

git clone git@github.com:jillix/engine.git $ENGINE_APPS/engine
git clone git@github.com:jillix/admin.git $ENGINE_APPS/admin
mongo main
> db.users.insert({name: "admin@jillix.com", pwd: "1234", role: "admin", locale: "en_US"});
# download modules.zip https://github.com/jillix/admin/releases/tag/0.0.1-alpha
cd $ENGINE_APPS/admin
npm install
mv ~/Downloads/modules.zip ./
rm -rf modules
unzip modules.zip
rm modules.zip
cd $ENGINE_APPS/engine
npm install
 
# Add domains in `/etc/hosts`
# 127.0.0.1       github.jillix.admin.jillix.ch
# 127.0.0.1       github.jillix.starter.jillix.ch
# 127.0.0.1       github.jillix.composition-visualization.jillix.ch
 
node lib/project/server.js admin 10001
open http://github.jillix.admin.jillix.ch:10001/
```

## Start proxy

```sh
$ node lib/proxy/server.js
```
