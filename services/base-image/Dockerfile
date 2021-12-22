FROM alpine:3.14

ENV SHELL=/bin/bash

WORKDIR /

COPY contents /transferred

RUN apk update
RUN apk add bash cmake git build-base autoconf libtool pkgconfig boost-dev fmt gtest-dev
RUN /transferred/install_grpc.sh

CMD /bin/bash
