FROM commapp/backup-base:1.0

ENV SHELL=/bin/bash

COPY services/backup/contents /transferred
COPY native/cpp/CommonCpp/grpc/protos/backup.proto /transferred/server/protos/backup.proto

RUN /transferred/build_server.sh

CMD /transferred/run_server.sh && /bin/bash
