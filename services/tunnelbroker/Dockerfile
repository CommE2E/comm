FROM commapp/services-base:1.3.2

ENV PATH=/root/.cargo/bin:$PATH

ARG COMM_TEST_SERVICES
ARG COMM_SERVICES_SANDBOX

ENV COMM_TEST_SERVICES=${COMM_TEST_SERVICES}
ENV COMM_SERVICES_SANDBOX=${COMM_SERVICES_SANDBOX}

# Install Curl
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y curl

# Install Rust
RUN curl https://sh.rustup.rs -sSf | sh -s -- -y

# Copying of the installation scripts
WORKDIR /transferred/services/tunnelbroker/docker
COPY services/tunnelbroker/docker .

# Copying of the shared code
WORKDIR /transferred
COPY services/lib/src/ services/lib/src/
COPY shared/ shared/

# Copying of the Tunnelbroker code
WORKDIR /transferred/services/tunnelbroker
COPY services/tunnelbroker/ .

# Build Rust by Cargo
WORKDIR /transferred/services/tunnelbroker
RUN cargo build --release

CMD if [ "$COMM_TEST_SERVICES" -eq 1 ];\
  then\
    cargo test;\
  else\
    cargo run;\
  fi
