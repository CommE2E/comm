# Services Deployment

## Identity Service

Deploying the Identity service requires generating OPAQUE secrets, building the Docker image, and deploying the container.

### Building the Docker image

The Docker image can be built with the following command:

```bash
docker build --platform linux/amd64 -f services/identity -t commapp/identity-server:<tag> .
```

### Generating OPAQUE secrets

OPAQUE is an implementation of a PAKE (Password-Authenticated Key Exchange) protocol. This allows for authentication of a password user without the server ever possessing the underlying password. To generate the server credentials:

```
cd services/identity
mkdir secrets/
docker run -v $(pwd)/secrets:/home/comm/app/identity/secrets commapp/identity-server:<tag> identity keygen
```

**NOTE:** This OPAQUE keypair is used to encrypt the password credentials of all users. The contents of this file should be persisted in a safe manner.

### Running the Identity service

To run the service:

```
cd services/identity
docker run -d \
  -e KEYSERVER_PUBLIC_KEY=<public key> \
  -e OPAQUE_SERVER_SETUP=$(cat secrets/server_setup.txt) \
  -p 50054:50054 \
  commapp/identity-server:<tag>
```

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
