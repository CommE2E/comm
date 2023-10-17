FROM rust:1.70-bullseye

RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y \
  build-essential cmake git libgtest-dev libssl-dev zlib1g-dev \
  gnupg software-properties-common 

# These steps are required to install terraform
RUN wget -O- https://apt.releases.hashicorp.com/gpg | \
  gpg --dearmor | \
  tee /usr/share/keyrings/hashicorp-archive-keyring.gpg \
  && echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] \
  https://apt.releases.hashicorp.com $(lsb_release -cs) main" | \
  tee /etc/apt/sources.list.d/hashicorp.list \
  && apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y \
  terraform && rm -rf /var/lib/apt/lists/*

WORKDIR /home/root/app/commtest

# Install more recent version of protobuf, must be ran as root
COPY scripts/install_protobuf.sh ../../scripts/install_protobuf.sh
RUN ../../scripts/install_protobuf.sh

ENV CARGO_REGISTRIES_CRATES_IO_PROTOCOL=sparse

# Copy actual application sources
COPY shared ../../shared/
COPY services/comm-services-lib ../comm-services-lib
COPY services/terraform/dev ../terraform/dev
COPY services/terraform/modules ../terraform/modules
COPY services/commtest ./

CMD ["bash", "./run-tests-ci.sh"]
