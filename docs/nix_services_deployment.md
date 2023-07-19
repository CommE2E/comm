# Services Deployment

## Keyserver

Deploying the keyserver requires configuring it, building its Docker image, and deploying that image with Docker Compose.

### Configuration

In order for the keyserver to interact with other services and tools, the following must be added to `keyserver/.env`:

```
# Mandatory
COMM_DATABASE_DATABASE=comm
COMM_DATABASE_USER=<located in keyserver/secrets/db_config.json>
COMM_DATABASE_PASSWORD=<located in keyserver/secrets/db_config.json>
COMM_JSONCONFIG_secrets_user_credentials='{"username":"<user>","password":"<password>"}'
# Production instance
COMM_JSONCONFIG_secrets_identity_service_config="{\"identitySocketAddr\":\"https://identity.commtechnologies.org:50054\"}"

# Required for ETH Login
COMM_JSONCONFIG_secrets_alchemy='{"key":"<alchemy key>"}'
COMM_JSONCONFIG_secrets_walletconnect='{"key":"<wallet connect key>"}'

# Optional
COMM_JSONCONFIG_secrets_geoip_license='{"key":"<geoip license key>"}'
```

### Deploying Keyserver

Once configured, the keyserver can be deployed by simply running:

```
cd keyserver
./bash/dc.sh up --build
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
