FROM commapp/services-base:1.3.2

RUN apt-get update && \
  DEBIAN_FRONTEND=noninteractive apt-get install -y curl && \
  rm -rf /var/lib/apt/lists/*

ARG COMM_TEST_SERVICES
ARG COMM_SERVICES_SANDBOX

ENV COMM_TEST_SERVICES=${COMM_TEST_SERVICES}
ENV COMM_SERVICES_SANDBOX=${COMM_SERVICES_SANDBOX}

# Install Rust
RUN curl https://sh.rustup.rs -sSf | sh -s -- -y

WORKDIR /transferred/services/tunnelbroker

COPY services/lib/docker/ scripts/
COPY services/tunnelbroker/docker/ scripts/

# Install SDKs
RUN scripts/install_amqp_cpp.sh
RUN scripts/install_cryptopp.sh
RUN scripts/install_libuv.sh
RUN scripts/install_corrosion.sh

ADD shared/protos /transferred/shared/protos/
ADD shared/cmake /transferred/shared/cmake/

COPY services/tunnelbroker/ /transferred/services/tunnelbroker/
COPY services/lib/src/ /transferred/services/lib/src/

RUN scripts/build_service.sh

CMD if [ "$COMM_TEST_SERVICES" -eq 1 ]; then scripts/run_tests.sh; else scripts/run_service.sh; fi
