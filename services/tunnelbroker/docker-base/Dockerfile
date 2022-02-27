FROM commapp/services-base:1.0

ENV SHELL=/bin/bash

COPY services/tunnelbroker/docker-base/contents /transferred

RUN apt-get update && apt-get install -y \
	libcurl4-openssl-dev \
	libssl-dev \
	zlib1g-dev \
	&& rm -rf /var/lib/apt/lists/*

# Install SDKs
RUN /transferred/install_folly.sh
RUN /transferred/install_aws_sdk.sh
RUN /transferred/install_amqp_cpp.sh
RUN /transferred/install_cryptopp.sh
RUN /transferred/install_libuv.sh

CMD /bin/bash
