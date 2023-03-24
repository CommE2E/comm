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

# Install SDKs
RUN ./install_amqp_cpp.sh
RUN ./install_libuv.sh

# Copying of the shared code
WORKDIR /transferred
COPY services/lib/src/ services/lib/src/
COPY shared/ shared/

# Copying of the Tunnelbroker code
WORKDIR /transferred/services/tunnelbroker
COPY services/tunnelbroker/ .

# Build C++ library gTests by CMake
WORKDIR /transferred/services/tunnelbroker/src/libcpp/test
RUN cmake -B build . && make -C build -j$(nproc)

# Build Rust by Cargo
WORKDIR /transferred/services/tunnelbroker
RUN cargo build --release

CMD if [ "$COMM_TEST_SERVICES" -eq 1 ];\
  then\
    src/libcpp/test/build/bin/runTests --gtest_filter='-AmqpManager*:DatabaseManager*'\
    && cargo test;\
  else\
    cargo run;\
  fi
