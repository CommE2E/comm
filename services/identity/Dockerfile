FROM rust:1.67 as builder

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

COPY services/identity .
COPY shared/protos/identity_client.proto ../../shared/protos/
COPY shared/comm-opaque2 ../../shared/comm-opaque2

RUN cargo install --locked --path .

FROM debian:bullseye-slim

RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && useradd -m comm

WORKDIR /home/comm/app/identity

COPY --from=builder /usr/local/cargo/bin/identity \
  /usr/local/bin/identity

USER comm

CMD ["identity", "server"]
