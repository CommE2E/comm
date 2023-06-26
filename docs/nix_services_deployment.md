# Services Deployment

## Tunnelbroker

Deploying tunnelbroker consists of building the services image and deploying the container on an appropriate cloud instance.

### Building Tunnelbroker Image

The OCI image for tunnelbroker can be built using the following command.

```
docker build -f services/tunnelbroker -t commapp/tunnelbroker:<tag> .
# Alternatively, there's a script which creates a very small docker context before building
services/tunnelbroker/make_ -t commapp/tunnelbroker:<tag> .
```

### Running the container

Tunnelbroker can be ran in production using the following command.

```
docker run -d commapp/tunnelbroker:<tag> \
  -p 50051:50051 \
  -p 80:51001 \
  -v $HOME/.aws:/home/comm/.aws:ro \
  tunnelbroker \
  --amqp-uri=<amqp-uri> \
```
