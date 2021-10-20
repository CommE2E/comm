FROM commapp/tunnelbroker-base:1.0

ENV SHELL=/bin/bash

COPY services/backup/contents /transferred

RUN apt update -y &&\
  apt install -y libcurl4-openssl-dev libssl-dev uuid-dev zlib1g-dev libpulse-dev &&\
  cd / &&\
  /transferred/install_aws_sdk.sh

CMD /bin/bash
