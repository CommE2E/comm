FROM rust:1.67

RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y \
  build-essential cmake git libgtest-dev libssl-dev zlib1g-dev \
  && rm -rf /var/lib/apt/lists/* \
  && useradd -m /home/comm \
  && mkdir -p /home/comm/app/tunnelbroker

WORKDIR /home/comm/app/tunnelbroker

# Install more recent version of protobuf, must be ran as root
COPY scripts/install_protobuf.sh ../../scripts/install_protobuf.sh
RUN ../../scripts/install_protobuf.sh

COPY services/tunnelbroker .

COPY shared/protos ../../shared/protos
COPY shared/tunnelbroker_messages ../../shared/tunnelbroker_messages

RUN cargo install --path . && \
  rm -rf ./*

USER comm

CMD ["tunnelbroker"]
