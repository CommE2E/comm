FROM commapp/backup-base:1.0

ENV SHELL=/bin/bash

COPY services/blob/docker-server/contents /transferred
COPY native/cpp/CommonCpp/grpc/protos/blob.proto /transferred/server/protos/blob.proto

RUN /transferred/build_server.sh

CMD /transferred/run_server.sh && /bin/bash
