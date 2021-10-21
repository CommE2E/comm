FROM commapp/tunnelbroker-base:1.0

ENV SHELL=/bin/bash

COPY services/backup/contents /transferred

RUN apk update &&\
  apk add curl-dev openssl-dev libuuid zlib-dev &&\
  cd / &&\
  /transferred/install_aws_sdk.sh

CMD /bin/bash
