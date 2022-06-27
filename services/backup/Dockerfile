FROM commapp/services-base:1.1

RUN apt-get update && \
  apt-get install -y uuid-dev && \
  rm -rf /var/lib/apt/lists/*

ARG COMM_TEST_SERVICES
ARG COMM_SERVICES_SANDBOX

ENV COMM_TEST_SERVICES=${COMM_TEST_SERVICES}
ENV COMM_SERVICES_SANDBOX=${COMM_SERVICES_SANDBOX}

WORKDIR /transferred

COPY native/cpp/CommonCpp/grpc/protos/backup.proto native/cpp/CommonCpp/grpc/protos/blob.proto protos/
COPY services/lib/cmake-components cmake-components
COPY services/lib/docker/ scripts/
COPY services/backup/ .
COPY services/lib/src/* src/

RUN scripts/build_service.sh

CMD if [ "$COMM_TEST_SERVICES" -eq 1 ]; then scripts/run_tests.sh; else scripts/run_service.sh; fi
