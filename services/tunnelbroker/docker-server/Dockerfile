FROM commapp/tunnelbroker-base:1.0

ENV DEBIAN_FRONTEND=noninteractive
ENV SHELL=/bin/bash

COPY services/tunnelbroker/contents /transferred
COPY native/cpp/CommonCpp/grpc/protos/tunnelbroker.proto /transferred/server/protos/tunnelbroker.proto

CMD /transferred/build_and_run_server.sh && /bin/bash
