FROM commapp/services-base:1.0

ENV DEBIAN_FRONTEND=noninteractive
ENV SHELL=/bin/bash

WORKDIR /

COPY services/tunnelbroker/contents /transferred

RUN ./transferred/install_folly.sh

CMD /bin/bash
