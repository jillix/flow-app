# close now OrientDB server
if [ -n "$ORIENTDB_PROCESS_KILL" ]
then
    echo "Stopping OrientDB server..."
    kill `lsof -iTCP:$ORIENTDB_PORT -sTCP:LISTEN -t`
fi
