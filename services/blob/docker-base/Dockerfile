FROM commapp/backup-base:1.0

COPY services/blob/docker-base/contents /transferred

RUN apt-get update && apt-get install -y libssl-dev && rm -rf /var/lib/apt/lists/*
RUN /transferred/install_folly.sh

CMD /bin/bash
