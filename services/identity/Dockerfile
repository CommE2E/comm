FROM rust:1.75-bullseye as builder

RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y \
  build-essential cmake git libgtest-dev libssl-dev zlib1g-dev \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /home/root/app/

WORKDIR /home/root/app

# Install more recent version of protobuf, must be ran as root
COPY scripts/install_protobuf.sh ../../scripts/install_protobuf.sh
RUN ../../scripts/install_protobuf.sh

RUN mkdir -p /home/comm/app/identity
WORKDIR /home/comm/app/identity
RUN cargo init --bin

# Copy and prepare cargo workspace
COPY Cargo.toml ../../Cargo.toml
COPY Cargo.lock ../../Cargo.lock
# Remove rust-node-addon and native_rust_library from cargo workspace
RUN sed -i -E '/rust-node-addon|native_rust_library/d' ../../Cargo.toml

# Copy actual application sources
COPY shared/ ../../shared/
COPY services/identity .

RUN cargo build --release --target-dir /out

FROM debian:bullseye-slim

RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && useradd -m comm

WORKDIR /home/comm/app/identity

COPY --from=builder /out/release/identity \
  /usr/local/bin/identity

# For test/debug builds, optionally generate OPAQUE keypair file
ARG generate_keypair
RUN if [ "$generate_keypair" = "true" ]; then identity keygen; fi

USER comm

CMD ["identity", "server"]
