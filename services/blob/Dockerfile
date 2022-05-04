FROM commapp/services-base:1.1

RUN apt-get update && \
  apt-get install -y uuid-dev && \
  rm -rf /var/lib/apt/lists/*

WORKDIR /transferred

COPY native/cpp/CommonCpp/grpc/protos/blob.proto protos/blob.proto
COPY services/lib/ .
COPY services/lib/docker/ scripts/
COPY services/blob/ .

ARG COMM_SERVICES_DEV_MODE
ENV COMM_SERVICES_DEV_MODE=${COMM_SERVICES_DEV_MODE}

ARG COMM_TEST_SERVICES
ENV COMM_TEST_SERVICES=${COMM_TEST_SERVICES}

RUN scripts/build_service.sh

CMD if [ "$COMM_TEST_SERVICES" -eq 1 ]; then scripts/run_tests.sh; else scripts/run_service.sh; fi
