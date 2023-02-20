FROM commapp/services-base:1.3.2 as builder

ENV PATH=/root/.cargo/bin:$PATH

# Install Curl
RUN apt-get update \
  && DEBIAN_FRONTEND=noninteractive apt-get install -y curl \
  && rm -rf /var/lib/apt/lists/*

# Install Rust
RUN curl https://sh.rustup.rs -sSf | sh -s -- -y

RUN mkdir -p /home/comm/app/blob
WORKDIR /home/comm/app/blob
RUN cargo init --bin

# Cache build dependencies in a new layer
COPY services/blob/Cargo.toml services/blob/Cargo.lock ./
COPY services/comm-services-lib ../comm-services-lib
RUN cargo build --release && rm src/*.rs 

# Copy actual application sources
COPY services/blob .
COPY shared/protos/blob.proto ../../shared/protos/

# Remove the previously-built binary so that only the application itself is
# rebuilt
RUN rm ./target/release/deps/blob*
RUN cargo build --release

# Runner stage
FROM commapp/services-base:1.3.2 as runner

# Create a new user comm and use it to run subsequent commands
RUN useradd -m comm
USER comm

# Only copy built binary from builder stage
WORKDIR /home/comm/app/blob
COPY --from=builder /home/comm/app/blob/target/release/blob .

ARG COMM_SERVICES_SANDBOX
ENV COMM_SERVICES_SANDBOX=${COMM_SERVICES_SANDBOX}

CMD ["./blob"]
