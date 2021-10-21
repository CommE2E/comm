FROM alpine:3.14

ENV SHELL=/bin/bash

WORKDIR /

COPY services/base-image/contents /transferred

RUN apk update &&\
    apk add bash cmake git build-base autoconf libtool pkgconfig boost-dev fmt &&\
    /transferred/install_grpc.sh

CMD /bin/bash
