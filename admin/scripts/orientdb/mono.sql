create database remote:localhost/mono root @ORIENTDB_ROOT_PASSWORD@ local;

import database admin/scripts/orientdb/schema.json;

create index moduleNames on VModule (source, owner, name) unique;
create index applicationIds on VApplication (id) unique;
create index applicationRoles on VRole (app, name) unique;
create index domainNames on VDomain (name) unique;
create index datasourceNames on VDatasource (app, name) unique;

import database admin/scripts/orientdb/records.json;

rebuild index *;

info;

