FROM tunnelbroker-base:1.0

ENV DEBIAN_FRONTEND=noninteractive
ENV SHELL=/bin/bash

COPY services/tunnelbroker/contents /transferred
COPY native/cpp/CommonCpp/grpc/protos /transferred/server/protos

CMD /transferred/build_and_run_server.sh && /bin/bash
