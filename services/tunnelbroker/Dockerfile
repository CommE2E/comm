FROM commapp/services-base:1.3

ARG MAKE_JOBS=4
ENV MAKEFLAGS="-j${MAKE_JOBS}"

WORKDIR /transferred/scripts

# Install Curl
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y curl

# Install SDKs
COPY services/tunnelbroker/docker/install_amqp_cpp.sh .
RUN ./install_amqp_cpp.sh

COPY services/tunnelbroker/docker/install_cryptopp.sh .
RUN ./install_cryptopp.sh

COPY services/tunnelbroker/docker/install_libuv.sh .
RUN ./install_libuv.sh

RUN curl https://sh.rustup.rs -sSf | sh -s -- -y

COPY services/tunnelbroker/docker/install_corrosion.sh .
RUN ./install_corrosion.sh

ARG COMM_TEST_SERVICES
ARG COMM_SERVICES_SANDBOX

ENV COMM_TEST_SERVICES=${COMM_TEST_SERVICES}
ENV COMM_SERVICES_SANDBOX=${COMM_SERVICES_SANDBOX}

WORKDIR /transferred

ADD native/cpp/CommonCpp/grpc grpc
COPY services/lib/cmake-components cmake-components
COPY services/lib/docker/ scripts/
COPY services/tunnelbroker/docker/* docker/
COPY services/tunnelbroker/ .
COPY services/lib/src/* src/

RUN scripts/build_service.sh

CMD if [ "$COMM_TEST_SERVICES" -eq 1 ]; then scripts/run_service.sh; else scripts/run_service.sh; fi
