FROM alpine:3.14

ENV DEBIAN_FRONTEND=noninteractive
ENV SHELL=/bin/bash

WORKDIR /

COPY services/tunnelbroker/contents /transferred

RUN apk update &&\
    apk add bash cmake git build-base autoconf libtool pkgconfig boost-dev fmt &&\
    cd /usr/lib &&\
    git clone https://github.com/facebook/folly.git --branch v2020.01.13.00 --single-branch &&\
    git clone https://github.com/google/glog.git --branch v0.4.0 --single-branch &&\
    git clone https://github.com/google/double-conversion.git --branch  v3.1.5 --single-branch  &&\
    cd / &&\
    /transferred/install_grpc.sh

CMD /bin/bash
