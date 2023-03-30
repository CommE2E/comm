# Nix services prerequisites

## Docker

To build and run the services you need to install [Docker](https://docs.docker.com/desktop/) and [Docker Compose](https://docs.docker.com/compose/install) on your system.

## LocalStack

We use LocalStack to emulate AWS services, allowing us to develop and test our services locally. To start LocalStack, run:

```
comm-dev services start
```

Make sure your LocalStack resources are up to date:

```
cd services/terraform
./run.sh
```

## Configuring the AWS CLI

To interact with the emulated AWS services on your local machine, you’ll need to configure the AWS CLI.

From your terminal, run:

```
aws configure
```

You will be prompted to enter the following information:

- AWS Access Key ID: Enter `test` as the Access Key ID.
- AWS Secret Access Key: Enter `test` as the Secret Access Key.
- Default region name: Enter `us-east-2`.
- Default output format: Press Enter to use the default output format or enter your preferred format (e.g., `json`, `text`, or `yaml`).
