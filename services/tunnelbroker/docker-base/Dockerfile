FROM commapp/services-base:1.1

ENV SHELL=/bin/bash

COPY services/tunnelbroker/docker-base/contents /transferred

# Install SDKs
RUN /transferred/install_amqp_cpp.sh
RUN /transferred/install_cryptopp.sh
RUN /transferred/install_libuv.sh

CMD /bin/bash
