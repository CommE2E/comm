FROM ubuntu:20.04

ENV DEBIAN_FRONTEND=noninteractive
ENV SHELL=/bin/bash

COPY services/tunnelbroker/grpc-server/transferred /transferred

RUN apt update -y &&\
    apt install -y cmake git build-essential autoconf libtool pkg-config libboost-all-dev libfmt-dev &&\
    cd /usr/lib &&\
    git clone https://github.com/facebook/folly.git --branch v2020.01.13.00 --single-branch &&\
    git clone https://github.com/google/glog.git --branch v0.4.0 --single-branch &&\
    git clone https://github.com/google/double-conversion.git --branch  v3.1.5 --single-branch  &&\
    cd / &&\
    /transferred/install_grpc.sh

CMD /bin/bash
