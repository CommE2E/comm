# Services Deployment

## Tunnelbroker

Deploying Tunnelbroker consists of building its Docker image and deploying that image as a Docker container.

### Building Tunnelbroker Image

The Docker image for Tunnelbroker can be built using the following command from the project root:

```
docker build -f services/tunnelbroker -t commapp/tunnelbroker:<tag> .
# Alternatively, there's a script which creates a very small docker context before building
services/tunnelbroker/make_docker_image.sh -t commapp/tunnelbroker:<tag> .
```

### Running the container

Tunnelbroker can be run in production using the following command:

```
docker run -d commapp/tunnelbroker:<tag> \
  -p 50051:50051 \
  -p 80:51001 \
  -v $HOME/.aws:/home/comm/.aws:ro \
  tunnelbroker \
  --amqp-uri=<amqp-uri> \
```
