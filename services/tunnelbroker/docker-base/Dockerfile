FROM commapp/services-base:1.0

ENV SHELL=/bin/bash

COPY services/tunnelbroker/docker-base/contents /transferred

RUN apk update
RUN apk add curl-dev openssl-dev zlib-dev

# Install SDKs
RUN /transferred/install_folly.sh
RUN /transferred/install_aws_sdk.sh
RUN /transferred/install_amqp_cpp.sh
RUN /transferred/install_cryptopp.sh
RUN /transferred/install_libuv.sh

CMD /bin/bash
