FROM commapp/services-base:1.3.2

RUN apt-get update && \
  apt-get install -y uuid-dev && \
  rm -rf /var/lib/apt/lists/*

ARG COMM_TEST_SERVICES
ARG COMM_SERVICES_SANDBOX

ENV COMM_TEST_SERVICES=${COMM_TEST_SERVICES}
ENV COMM_SERVICES_SANDBOX=${COMM_SERVICES_SANDBOX}

WORKDIR /transferred/backup

COPY services/lib/docker/ scripts/

RUN scripts/install_rust.sh
ENV PATH="${PATH}:~/.cargo/bin"
RUN scripts/install_corrosion.sh

COPY native/cpp/CommonCpp/grpc grpc/
COPY services/lib/cmake-components cmake-components/

COPY services/backup/ /transferred/backup/
COPY services/lib/src/ /transferred/lib/src/

# ENTRYPOINT ~/.cargo/bin/cargo build --manifest-path=blob_client/Cargo.toml

RUN bash scripts/build_service.sh

# CMD ls -l && echo "---" && ls -l grpc && pwd && ls grpc/protos && echo "---" && ls -l blob_client && ls -l /transferred/backup/blob_client/protos/blob.proto

# CMD if [ "$COMM_TEST_SERVICES" -eq 1 ]; then scripts/run_tests.sh; else scripts/run_service.sh; fi

CMD /bin/bash
