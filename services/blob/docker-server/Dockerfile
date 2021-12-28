FROM commapp/blob-base:1.0

ENV SHELL=/bin/bash

COPY services/blob/docker-server/contents /transferred
COPY native/cpp/CommonCpp/grpc/protos/blob.proto /transferred/server/protos/blob.proto

ARG COMM_TEST_SERVICES
ENV COMM_TEST_SERVICES=${COMM_TEST_SERVICES}

RUN /transferred/build_server.sh

CMD /transferred/run_server.sh
