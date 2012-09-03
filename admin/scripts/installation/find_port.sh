#! /bin/bash

MIN_PORT=10001
MAX_PORT=10999

# procedure to find if an element is in an array
# containsElement searchedFor searchIn
containsElement () {
    local e
    for e in "${@:2}"; do [[ "$e" == "$1" ]] && return 0; done
    return 1
}

# find all the running mono application pids
declare -a pids=$(lsof -P -iTCP:8000-11000 -sTCP:LISTEN | grep node | awk '{ print $9 }' | cut -d ":" -f 2 | {
    while read line
    do
        pids="${pids} '$line'"
    done
    echo "($pids)"
})

# find the first free port
for (( i=$MIN_PORT; i <= $MAX_PORT; i++ ))
do
    containsElement $i "${pids[@]}"
    if [ $? -gt 0 ]
    then
        FREE_PORT=$i
        break
    fi
done

if [ -z "$FREE_PORT" ]
then
    exit 1
fi

echo $FREE_PORT

