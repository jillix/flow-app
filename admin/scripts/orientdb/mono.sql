drop database remote:localhost/mono root 88CB04F733443972EFB1914984EE2C57AFBA63399D05948A2155CB78B0F55FBC;
create database remote:localhost/mono root 88CB04F733443972EFB1914984EE2C57AFBA63399D05948A2155CB78B0F55FBC local;

connect remote:localhost/mono admin admin;
import database /Users/gabriel/Work/jillix/admin/scripts/orientdb/schema.json;
import database /Users/gabriel/Work/jillix/admin/scripts/orientdb/records.json;

classes;

select from OGraphVertex;

