#!/usr/bin/env node
"use strict"

const fs = require("fs");
const presolve = require("path").resolve;
const promisify = require("util").promisify;
const exec = promisify(require("child_process").exec);
const read = promisify(fs.readFile);
const open = promisify(fs.open);
const rmdir = promisify(fs.rmdir);
const lstat = promisify(fs.lstat);
const unlink = promisify(fs.unlink);
const symlink = promisify(fs.symlink);
const git_url = process.argv[2];
const app_base_path = presolve(process.argv[3] || ".");

if (!git_url) {
    throw new Error("Missing git url.");
}

const repo_name = git_url.split("/").pop().split(".")[0];
const repo_path = app_base_path + "/git_repos/";
const deps_path = app_base_path + "/node_modules/";
const log_error = console.error.bind(console);

// clone the git repository
console.log("Replace dependency", "\"" + repo_name + "\"", "with git repo:", git_url);
exec("git clone --depth 1 " + git_url + " " + repo_path + repo_name)

// get module name from package + npm install
.then(() => {
    // check if package file exists
    return open(repo_path + repo_name + "/package.json", "r")
    .then((fd) => {

        // npm install
        console.log("- npm install...")
        return exec("cd " + repo_path + repo_name + "; npm i")

        // get module name from package
        .then(() => {
            console.log("- npm install done.")
            return read(fd);
        })
        .then(JSON.parse)
        .then((pkg) => {
            return pkg.name || repo_name;
        })
        .catch(log_error);
    })
    .catch((err) => {
        return repo_name;
    });
})

// remove existing dependency
.then((repo_name) => {

    // check if a module is installed with that name (folder exits)
    return lstat(deps_path + repo_name)
    .then((stats) => {
        // remove directory or symlink
        console.log("- remove npm dependency.")
        return (stats.isSymbolicLink() ? unlink(deps_path + repo_name) : exec("rm -rf " + deps_path + repo_name))
        .then(() => {
            return repo_name;
        });
    })
    .catch((err) => {
        return err.code === "ENOENT" ? repo_name : Promise.reject(err);
    });
})
// create symlink to git repo
.then((repo_name) => {
    console.log("- create symlink to git repo.")
    return symlink(repo_path  + repo_name, deps_path + repo_name, "dir");
})
.then(() => {
    console.log("Done!");
})
.catch(log_error);
