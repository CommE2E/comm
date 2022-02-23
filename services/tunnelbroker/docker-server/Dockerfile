FROM commapp/tunnelbroker-base:2.1

ARG COMM_TEST_SERVICES

ENV SHELL=/bin/bash
ENV COMM_TEST_SERVICES=${COMM_TEST_SERVICES}

COPY services/tunnelbroker/docker-server/contents /transferred
COPY native/cpp/CommonCpp/grpc/protos/tunnelbroker.proto /transferred/server/protos/tunnelbroker.proto

RUN /transferred/build_server.sh

CMD if [ "$COMM_TEST_SERVICES" -eq 1 ]; then /transferred/run_tests.sh; else /transferred/run_server.sh; fi
