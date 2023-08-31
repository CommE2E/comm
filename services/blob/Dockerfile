FROM rust:1.70-bullseye as builder

RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y \
  build-essential cmake git libgtest-dev libssl-dev zlib1g-dev \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /home/root/app/blob

# Install more recent version of protobuf, must be ran as root
COPY scripts/install_protobuf.sh ../../scripts/install_protobuf.sh
RUN ../../scripts/install_protobuf.sh

ENV CARGO_REGISTRIES_CRATES_IO_PROTOCOL=sparse


# Copy actual application sources
COPY services/comm-services-lib ../comm-services-lib
COPY services/blob ./

RUN cargo install --locked --path .

# Runner stage
FROM debian:bullseye-slim as runner

# Update dependencies, install ca-certificates which are required for TLS
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Only copy built binary from builder stage
COPY --from=builder /usr/local/cargo/bin/blob /usr/local/bin/blob
WORKDIR /home/comm/app/blob

# Create a new user comm and use it to run subsequent commands
RUN useradd -m comm
USER comm

ENV RUST_LOG=info

CMD ["blob"]

