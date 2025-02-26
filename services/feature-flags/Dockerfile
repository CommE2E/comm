FROM rust:1.85-bullseye as builder

RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y \
  build-essential cmake git libgtest-dev libssl-dev zlib1g-dev \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /home/root/services/feature-flags

ENV CARGO_REGISTRIES_CRATES_IO_PROTOCOL=sparse

# Copy and prepare cargo workspace
COPY Cargo.toml ../../Cargo.toml
COPY Cargo.lock ../../Cargo.lock
# Remove rust-node-addon from cargo workspace
RUN sed -i -E '/rust-node-addon/d' ../../Cargo.toml

# Copy actual application sources
COPY shared ../../shared/
COPY services/feature-flags ./

RUN cargo build --release --target-dir /out

# Runner stage
FROM debian:bullseye-slim as runner

# Update dependencies, install ca-certificates which are required for TLS
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Only copy built binary from builder stage
COPY --from=builder /out/release/feature-flags /usr/local/bin/feature-flags
WORKDIR /home/comm/app/feature-flags

# Create a new user comm and use it to run subsequent commands
RUN useradd -m comm
USER comm

ENV RUST_LOG=info

CMD ["feature-flags"]
