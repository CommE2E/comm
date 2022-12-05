FROM commapp/services-base:1.3.2

RUN apt-get update && \
  apt-get install -y uuid-dev && \
  rm -rf /var/lib/apt/lists/*

ARG COMM_TEST_SERVICES
ARG COMM_SERVICES_SANDBOX

ENV COMM_TEST_SERVICES=${COMM_TEST_SERVICES}
ENV COMM_SERVICES_SANDBOX=${COMM_SERVICES_SANDBOX}

# install rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y

WORKDIR /transferred/services/backup

COPY services/lib/docker/ scripts/

RUN scripts/install_corrosion.sh

ADD shared/protos /transferred/shared/protos/
ADD shared/cmake /transferred/shared/cmake/

COPY services/backup/old/ /transferred/services/backup/
COPY services/lib/src/ /transferred/services/lib/src/

RUN scripts/build_service.sh

CMD if [ "$COMM_TEST_SERVICES" -eq 1 ]; then scripts/run_tests.sh; else scripts/run_service.sh; fi
