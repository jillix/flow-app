#/bin/bash

VERSION=v$1
DIST=iojs-$VERSION-linux-x64
TAR=$DIST".tar.xz"
URL=https://iojs.org/dist/$VERSION/$TAR

echo $VERSION
echo $DIST
echo $TAR
echo $URL

# remove downloaded files
rm iojs-v*

# download iojs
wget $URL

# extract iojs
tar -xf $TAR

# move into iojs folder
cd $DIST

# kill all node/iojs processes
pkill node

# replace the binaries on the machine
cp bin/* /usr/bin

# remove downloaded files
cd ../
rm -r $DIST
rm iojs-v*

# print version
iojs -v
