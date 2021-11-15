FROM commapp/tunnelbroker-base:1.0

ENV DEBIAN_FRONTEND=noninteractive
ENV SHELL=/bin/bash

COPY services/tunnelbroker/contents /transferred
COPY native/cpp/CommonCpp/grpc/protos/tunnelbroker.proto /transferred/server/protos/tunnelbroker.proto

RUN /transferred/build_server.sh

CMD /transferred/run_server.sh && /bin/bash
