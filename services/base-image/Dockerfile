FROM ubuntu:20.04

ENV SHELL=/bin/bash

RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y \
	cmake \
	git \
	build-essential \
	autoconf \
	libtool \
	pkg-config \
	libboost-all-dev \
	libfmt-dev \
	libgflags-dev \
	libgtest-dev \
  libcurl4-openssl-dev \
  libssl-dev \
  zlib1g-dev \
	curl \
  && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /transferred/scripts
WORKDIR /transferred/scripts

COPY docker/install_grpc.sh .
RUN ./install_grpc.sh

COPY docker/install_aws_sdk.sh .
RUN ./install_aws_sdk.sh

COPY docker/install_glog.sh .
RUN ./install_glog.sh

COPY docker/install_double.sh .
RUN ./install_double.sh

COPY docker/install_folly.sh .
RUN ./install_folly.sh

CMD /bin/bash
