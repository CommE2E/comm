FROM commapp/services-base:1.0

ENV SHELL=/bin/bash

COPY services/tunnelbroker/docker-base/contents /transferred

RUN apk update
RUN apk add curl-dev openssl-dev zlib-dev poco-dev

# Install SDKs
RUN /transferred/install_folly.sh
RUN /transferred/install_aws_sdk.sh
RUN /transferred/install_amqp_cpp.sh

CMD /bin/bash
