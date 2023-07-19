# Services Deployment

## Keyserver

Deploying the keyserver requires configuring it, building its Docker image, and deploying that image with Docker Compose.

### Configuration

Keyserver must interact with several different services as well as hosts the Comm landing page.

Services which interface with Keyserver:

- MariaDB: Database used to store much of the information created when using Keyserver.
- Identity Service: Comm service that mints and verifies Comm identities.
- Ethereum: A crypto community centered around the ETH token. ETH wallets can be used to authenticate with Comm.

Keyserver provides two services:

- Landing page: Static site for displaying resources about Comm.
- Comm App: Web frontend for the Comm communications application.

For the keyserver to interface with its dependencies, host the landing page, and host the Comm web application; the following must be added to `keyserver/.env`:

```
# Mandatory
COMM_DATABASE_DATABASE=comm
COMM_DATABASE_USER=<MariaDB user>
COMM_DATABASE_PASSWORD=<MariaDB password>
COMM_JSONCONFIG_secrets_user_credentials='{"username":"<user>","password":"<password>"}'
COMM_JSONCONFIG_facts_landing_url='{"baseDomain":"http://localhost","basePath":"/commlanding/","baseRoutePath":"/commlanding/","https":false}'
COMM_JSONCONFIG_facts_commapp_url='{"baseDomain":"http://localhost:3000","basePath":"/comm/","https":false,"baseRoutePath":"/comm/","proxy":"none"}'

# Required to connect to production Identity service
COMM_JSONCONFIG_secrets_identity_service_config="{\"identitySocketAddr\":\"https://identity.commtechnologies.org:50054\"}"

# Required for ETH login
COMM_JSONCONFIG_secrets_alchemy='{"key":"<alchemy key>"}'
COMM_JSONCONFIG_secrets_walletconnect='{"key":"<wallet connect key>"}'
```

### Building & deploying

Once configured, the keyserver can be built and deployed by simply running:

```bash
cd keyserver
./bash/dc.sh up --build
```
