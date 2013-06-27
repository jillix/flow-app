#!/bin/bash

MONO_ROOT=`pwd`

# remove module cache
rm -Rf "$MONO_ROOT"/modules/*
# remove installed application
rm -Rf "$MONO_ROOT"/apps/*

# drop Mongo database (monodev)
mongo monodev --eval "db.dropDatabase()"
