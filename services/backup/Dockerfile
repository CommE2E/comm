FROM commapp/services-base:1.3.2

RUN apt-get update && \
  apt-get install -y uuid-dev && \
  rm -rf /var/lib/apt/lists/*

ARG COMM_TEST_SERVICES
ARG COMM_SERVICES_SANDBOX

ENV COMM_TEST_SERVICES=${COMM_TEST_SERVICES}
ENV COMM_SERVICES_SANDBOX=${COMM_SERVICES_SANDBOX}

WORKDIR /transferred/backup

COPY services/lib/docker/ scripts/

# install rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
RUN scripts/install_corrosion.sh

COPY native/cpp/CommonCpp/grpc grpc/
COPY services/lib/cmake-components cmake-components/

COPY services/backup/ /transferred/backup/
COPY services/lib/src/ /transferred/lib/src/

RUN scripts/build_service.sh

CMD if [ "$COMM_TEST_SERVICES" -eq 1 ]; then scripts/run_tests.sh; else scripts/run_service.sh; fi
