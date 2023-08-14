# Keyserver Deployment

Deploying the keyserver requires configuring it, building its Docker image, and deploying that image with Docker Compose.

## Configuration

In order for the keyserver to interface with dependencies, host the landing page, and host the Comm web application, the following must be added to `keyserver/.env`:

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

# Example backup configuration that stores up to 10 GiB of backups in /home/comm/backups
COMM_JSONCONFIG_facts_backups='{"enabled":true,"directory":"/home/comm/backups","maxDirSizeMiB":10240}'
```

### MariaDB configuration

- `COMM_DATABASE_DATABASE`: Specifies the name of the database the keyserver will use.
- `COMM_DATABASE_USER`: The username the keyserver uses to connect to MariaDB. Replace `<MariaDB user>` with your desired username.
- `COMM_DATABASE_PASSWORD`: Corresponding password for the above user. Replace `<MariaDB password>` with your desired password.

### Identity service configuration

- `COMM_JSONCONFIG_secrets_user_credentials`: Credentials for authenticating against the Identity service. Replace `<user>` and `<password>` with any values. In the future, they will need to be actual credentials registered with the Identity service.
- `COMM_JSONCONFIG_secrets_identity_service_config`: Socket address for the Identity service. If omitted, the keyserver will try to connect to a local instance of the Identity service.

### ETH login configuration

- `COMM_JSONCONFIG_secrets_alchemy`: Alchemy key used for Ethereum Name Service (ENS) resolution and retrieving ETH public keys. Replace `<alchemy key>` with your actual key.
- `COMM_JSONCONFIG_secrets_walletconnect`: WalletConnect key used to enable Sign-In with Ethereum (SIWE). Replace `<wallet connect key>` with your actual key.

### URL configuration

- `COMM_JSONCONFIG_facts_commapp_url`: Your keyserver needs to know what its externally-facing URL is in order to construct links. It also needs to know if it’s being proxied to that externally-facing URL, and what the internal route path is.
  - `baseDomain`: Externally-facing domain. Used for constructing links.
  - `basePath`: Externally-facing path. Used for constructing links.
  - `baseRoutePath`: Internally-facing path. Same as basePath if no proxy. If there’s a proxy, this is the local path (e.g. http://localhost:3000/landing would correspond with /landing/)
  - `proxy`: `"none" | "apache"` Determines which request headers to use for HTTPS validation and IP address timezone detection.
  - `https`: If true, checks request headers to validate that HTTPS is in use.

### Backup configuration

- `COMM_JSONCONFIG_facts_backups`: Specifies whether to enable backups, where to store them, and the max size of the backups directory.

## Building & deploying

Once configured, the keyserver can be built and deployed by simply running:

```bash
cd keyserver
./bash/dc.sh up --build
```
