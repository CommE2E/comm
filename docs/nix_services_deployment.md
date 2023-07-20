# Services Deployment

## Identity Service

Deploying identity service consists of generating the OPAQUE secrets, building the docker image, and deploying the container.

### Building the docker image

The docker image can be built with the following command:

```bash
docker build -f services/identity -t commapp/identity-server:<tag> .
```

### Generating OPAQUE secrets

OPAQUE is an implementation of a PAKE (Passwor-Authenticated Key Exchange) protocol. This allows for authentication of a user without requiring the password credentials to be stored on the server. To generate the server credentials:

```
docker run -v comm-identity-secrets:/home/comm/app/identity/secrets identity keygen
```

**NOTE:** This OPAQUE key pair is used to encrypt the password credentials of all users, the contents of this file should be persisted in a safe manner beyond a docker volume.

### Running identity service

To run the services

```
docker run -d \
  -e KEYSERVER_PUBLIC_KEY=<public key> \
  -p 50054:50054 \
  -v comm-identity-secrets:/home/comm/app/identity/secrets \
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
