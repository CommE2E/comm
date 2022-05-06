FROM commapp/services-base:1.1

RUN apt-get update && \
  apt-get install -y uuid-dev && \
  rm -rf /var/lib/apt/lists/*

ARG COMM_TEST_SERVICES
ARG COMM_SERVICES_DEV_MODE

ENV COMM_TEST_SERVICES=${COMM_TEST_SERVICES}
ENV COMM_SERVICES_DEV_MODE=${COMM_SERVICES_DEV_MODE}

WORKDIR /transferred

COPY native/cpp/CommonCpp/grpc/protos/backup.proto native/cpp/CommonCpp/grpc/protos/blob.proto protos/
COPY services/backup/docker/ scripts/
COPY services/lib/ .
COPY services/backup/ .

RUN scripts/build_server.sh

CMD if [ "$COMM_TEST_SERVICES" -eq 1 ]; then scripts/run_tests.sh; else scripts/run_server.sh; fi
