FROM commapp/backup-base:1.0

COPY services/tunnelbroker/docker-base/contents /transferred

RUN apk add openssl-dev
RUN /transferred/install_folly.sh

CMD /bin/bash
