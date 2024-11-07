FROM rust:1.82-bullseye as builder

RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y \
  build-essential cmake git libgtest-dev libssl-dev zlib1g-dev \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /home/root/app/

WORKDIR /home/root/services/tunnelbroker

# Install more recent version of protobuf, must be ran as root
COPY scripts/install_protobuf.sh ../../scripts/install_protobuf.sh
RUN ../../scripts/install_protobuf.sh

# Copy and prepare cargo workspace
COPY Cargo.toml ../../Cargo.toml
COPY Cargo.lock ../../Cargo.lock
# Remove rust-node-addon from cargo workspace
RUN sed -i -E '/rust-node-addon/d' ../../Cargo.toml

COPY services/tunnelbroker .
COPY shared ../../shared/

RUN cargo build --release --target-dir /out

FROM debian:bullseye-slim as runner

RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && useradd -m comm \
  && mkdir -p /home/comm/app/tunnelbroker

WORKDIR /home/comm/app/tunnelbroker

COPY --from=builder /out/release/tunnelbroker \
  /usr/local/bin/tunnelbroker

USER comm

CMD ["tunnelbroker"]
