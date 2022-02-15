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
	libgtest-dev

RUN /transferred/install_grpc.sh

CMD /bin/bash
