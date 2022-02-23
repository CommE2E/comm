FROM ubuntu:20.04

ENV SHELL=/bin/bash

WORKDIR /

COPY contents /transferred

RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y \
	cmake \
	git \
	build-essential \
	autoconf \
	libtool \
	pkg-config \
	libboost-all-dev \
	libfmt-dev \ 
	libgtest-dev \
  libcurl4-openssl-dev \
  libssl-dev \
  zlib1g-dev

RUN /transferred/install_grpc.sh
RUN /transferred/install_aws_sdk.sh
RUN /transferred/install_folly.sh

CMD /bin/bash
