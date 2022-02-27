FROM commapp/services-base:1.0

ENV SHELL=/bin/bash

COPY services/backup/docker-base/contents /transferred

RUN apt-get update && apt-get install -y \
	libcurl4-openssl-dev \
	libssl-dev \
	uuid-dev \
	zlib1g-dev \
	&& rm -rf /var/lib/apt/lists/*
	
RUN cd /
RUN /transferred/install_aws_sdk.sh

CMD /bin/bash
