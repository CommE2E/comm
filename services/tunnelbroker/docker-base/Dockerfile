FROM commapp/services-base:1.0

ENV SHELL=/bin/bash

COPY services/tunnelbroker/docker-base/contents /transferred

RUN /transferred/install_folly.sh

CMD /bin/bash
