drop database remote:localhost/mono root @ORIENTDB_ROOT_PASSWORD@;
create database remote:localhost/mono root @ORIENTDB_ROOT_PASSWORD@ local;

import database admin/scripts/orientdb/schema.json;

create index moduleNames on VModule (owner, name) unique;

import database admin/scripts/orientdb/records.json;

rebuild index *;

info;

