FROM alpine:3.11
LABEL maintainer="Duoquote"

ENV NODE_ENV production

RUN addgroup -g 1000 node &&\
adduser -u 1000 -G node -s /bin/sh -D node &&\
apk add --no-cache libstdc++ &&\
apk add --no-cache --virtual .build-deps git binutils-gold \
curl g++ gcc gnupg libgcc linux-headers make python &&\
wget https://nodejs.org/dist/v12.16.1/node-v12.16.1.tar.gz &&\
tar -xzf node-v12.16.1.tar.gz &&\
cd node-v12.16.1 &&\
./configure &&\
make -j$(getconf _NPROCESSORS_ONLN) V= &&\
make install &&\
cd .. &&\
rm -rf ./node-v* &&\
mkdir app &&\
git clone https://github.com/Duoquote/duo-web.git app/ &&\
apk del .build-deps &&\
cd app &&\
NODE_ENV=development npm install &&\
npm run build &&\
npm prune &&\
rm -rf pages/*