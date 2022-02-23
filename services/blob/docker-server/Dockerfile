FROM commapp/blob-base:1.3

ARG COMM_SERVICES_DEV_MODE

ENV SHELL=/bin/bash
ENV COMM_SERVICES_DEV_MODE=${COMM_SERVICES_DEV_MODE}

COPY services/blob/docker-server/contents /transferred
COPY native/cpp/CommonCpp/grpc/protos/blob.proto /transferred/server/protos/blob.proto

ARG COMM_TEST_SERVICES
ENV COMM_TEST_SERVICES=${COMM_TEST_SERVICES}

RUN /transferred/build_server.sh

CMD /transferred/run_server.sh
