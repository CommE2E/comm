FROM commapp/services-base:1.1

ARG MAKE_JOBS=4
ENV MAKEFLAGS="-j${MAKE_JOBS}"

WORKDIR /transferred/scripts

# Install SDKs
COPY services/tunnelbroker/docker/install_amqp_cpp.sh .
RUN ./install_amqp_cpp.sh

COPY services/tunnelbroker/docker/install_cryptopp.sh .
RUN ./install_cryptopp.sh

COPY services/tunnelbroker/docker/install_libuv.sh .
RUN ./install_libuv.sh

ARG COMM_TEST_SERVICES
ENV COMM_TEST_SERVICES=${COMM_TEST_SERVICES}

WORKDIR /transferred

COPY native/cpp/CommonCpp/grpc/protos/tunnelbroker.proto protos/tunnelbroker.proto
COPY services/lib/cmake-components cmake-components
COPY services/tunnelbroker/docker/ scripts/
COPY services/tunnelbroker/ .

RUN scripts/build_server.sh

CMD if [ "$COMM_TEST_SERVICES" -eq 1 ]; then scripts/run_tests.sh; else scripts/run_server.sh; fi
