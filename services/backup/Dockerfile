FROM commapp/services-base:1.3.1

RUN apt-get update && \
  apt-get install -y uuid-dev && \
  rm -rf /var/lib/apt/lists/*

ARG COMM_TEST_SERVICES
ARG COMM_SERVICES_SANDBOX

ENV COMM_TEST_SERVICES=${COMM_TEST_SERVICES}
ENV COMM_SERVICES_SANDBOX=${COMM_SERVICES_SANDBOX}

WORKDIR /transferred

COPY services/backup/ backup/
COPY services/lib/src/ lib/src/

WORKDIR /transferred/backup

COPY native/cpp/CommonCpp/grpc grpc/
COPY services/lib/docker/ scripts/

RUN scripts/build_service.sh

WORKDIR /transferred

CMD if [ "$COMM_TEST_SERVICES" -eq 1 ]; then scripts/run_tests.sh; else scripts/run_service.sh; fi
