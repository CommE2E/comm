FROM commapp/services-base:1.0

ENV SHELL=/bin/bash

COPY services/backup/docker-base/contents /transferred

RUN apk update
RUN apk add curl-dev openssl-dev libuuid zlib-dev
RUN cd /
RUN /transferred/install_aws_sdk.sh
RUN /transferred/install_folly.sh

CMD /bin/bash
