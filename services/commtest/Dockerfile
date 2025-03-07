FROM rust:1.85-bullseye
RUN rustup default stable

RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y \
  build-essential cmake git libgtest-dev libssl-dev zlib1g-dev \
  gnupg software-properties-common python3-pip

# These steps are required to install terraform
RUN wget -O- https://apt.releases.hashicorp.com/gpg | \
  gpg --dearmor | \
  tee /usr/share/keyrings/hashicorp-archive-keyring.gpg \
  && echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] \
  https://apt.releases.hashicorp.com $(lsb_release -cs) main" | \
  tee /etc/apt/sources.list.d/hashicorp.list \
  && apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y \
  terraform && rm -rf /var/lib/apt/lists/*

# install aws-cli v2, we must do this manually and per-platform
ARG TARGETPLATFORM
RUN if [ $(echo $TARGETPLATFORM | cut -d / -f2) = "arm64" ]; then \
  curl "https://awscli.amazonaws.com/awscli-exe-linux-aarch64.zip" -o "awscliv2.zip"; \
  else \
  curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"; \
  fi
RUN unzip -q awscliv2.zip && ./aws/install \
  && rm -rf awscliv2.zip aws

WORKDIR /home/root/services/commtest

# Install cargo lambda
RUN pip3 install cargo-lambda

# Install more recent version of protobuf, must be ran as root
COPY scripts/install_protobuf.sh ../../scripts/install_protobuf.sh
RUN ../../scripts/install_protobuf.sh
ENV CARGO_REGISTRIES_CRATES_IO_PROTOCOL=sparse
# ENV RUSTUP_AUTO_INSTALL=1

# Copy and prepare cargo workspace
COPY Cargo.toml ../../Cargo.toml
COPY Cargo.lock ../../Cargo.lock
# Remove rust-node-addon from cargo workspace
RUN sed -i -E '/rust-node-addon/d' ../../Cargo.toml

# Copy actual application sources
COPY shared ../../shared/
COPY services/terraform/dev ../terraform/dev
COPY services/terraform/modules ../terraform/modules
COPY services/commtest ./
COPY services/search-index-lambda ../search-index-lambda


CMD ["bash", "./run-tests-ci.sh"]
