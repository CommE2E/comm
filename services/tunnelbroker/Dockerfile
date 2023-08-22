FROM rust:1.70-bullseye as builder

RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y \
  build-essential cmake git libgtest-dev libssl-dev zlib1g-dev \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /home/root/app/

WORKDIR /home/root/app

# Install more recent version of protobuf, must be ran as root
COPY scripts/install_protobuf.sh ../../scripts/install_protobuf.sh
RUN ../../scripts/install_protobuf.sh

COPY services/tunnelbroker .

COPY shared ../../shared/

RUN cargo install --path .

FROM debian:bullseye-slim as runner

RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && useradd -m comm \
  && mkdir -p /home/comm/app/tunnelbroker

WORKDIR /home/comm/app/tunnelbroker

COPY --from=builder /usr/local/cargo/bin/tunnelbroker \
  /usr/local/bin/tunnelbroker

USER comm

CMD ["tunnelbroker"]
