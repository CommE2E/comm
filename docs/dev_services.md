# Requirements

At the moment, our services can be built and run on Linux and macOS via Docker. Unfortunately, Windows is not supported at this time. You’ll ideally want a machine with at least 16 GiB of RAM because running a Docker container can consume up to 4 GiB of RAM.

We use Ubuntu as the base Docker image for services.

# Prerequisites

## Docker

To build and run the services you need to install [Docker](https://docs.docker.com/desktop/) and [Docker Compose](https://docs.docker.com/compose/install) on your system.

## Node

We use the `yarn` package manager to install dependencies and run scripts. Installation instructions can be found in the [dev_environment doc](https://github.com/CommE2E/comm/blob/master/docs/dev_environment.md#node).

## AWS

Some of our services access AWS resources via the AWS C++ SDK. To access these resources, you'll need to configure the `~/.aws/credentials` and `~/.aws/config` files correctly on your host machine. Instructions for setting these configuration files can be found [here](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html).

We recommend running `aws configure`, which will prompt you for the necessary configuration values.

## Terraform

We use [Terraform](https://www.terraform.io/) to create and manage our AWS resources. Installation instructions can be found [here](https://www.terraform.io/downloads).

## RabbitMQ (Tunnelbroker only)

[RabbitMQ](https://www.rabbitmq.com/) is an open-source message broker service. We use RabbitMQ in Tunnelbroker to facilitate communication between devices and keyservers. We use the secure AMQPS protocol to connect to RabbitMQ instances hosted on AWS.

In order to access and manage RabbitMQ instances, you'll need credentials and the [proper permissions](https://www.rabbitmq.com/access-control.html). You can add new users or edit permissions for existing ones through the [RabbitMQ Management plugin](https://www.rabbitmq.com/management.html).

Alternatively, you can manage credentials and permissions from the `rabbitmqctl` CLI. For example, to add a new user you can run the following command:

```
rabbitmqctl add_user {username}
```

You'll need to create a Tunnelbroker-specific configuration file.

```
mkdir -p $HOME/.config
vim $HOME/.config/tunnelbroker.ini
```

Provide a unique ID for each running instance of Tunnelbroker and a RabbitMQ URI in accordance with this [specification](https://www.rabbitmq.com/uri-spec.html):

```
[tunnelbroker]
instance-id = tunnelbroker1

[keyserver]
default_keyserver_id = ks:256

[amqp]
uri = amqp://guest:guest@0.0.0.0/vhost
```

# Building and running

`services/package.json` provides useful scripts to build and run services. The `run` scripts will automatically build the services if necessary and run them.

You can find the full list of scripts [here](https://github.com/CommE2E/comm/blob/master/services/package.json) in the `scripts` section.

# Developing and debugging

## Visual Studio Code

If you are using Visual Studio Code as your code editor you can [attach to a Docker container](https://code.visualstudio.com/docs/remote/attach-container) and develop inside it.

## Sandbox environment for services

You can run the Comm services locally in a sandbox environment for development and testing purposes. The sandbox uses a [local cloud stack](https://localstack.cloud/) that includes DynamoDB and S3 running locally in Docker containers.

The sandbox also includes a [RabbitMQ](https://www.rabbitmq.com/) Docker container, which is required by Tunnelbroker.

### Configuration changes in the sandbox

In your sandbox, services will connect to a local cloud stack, ignoring the `~/.aws` connection settings. The `-test` suffix is applied for all DynamoDB table names in this mode.

The log level in this mode is increased from ERROR to INFO.

### Running services in the sandbox

First, you need to initialize the local cloud using the following command from the the `services` directory:

```
yarn init-local-cloud
```

This will start the LocalStack Docker image and initialize required resources, including DynamoDB tables and S3 buckets, using the Terraform scripts located in `services/terraform`.

To start a certain service in the sandbox you can run the following command:

```
yarn run-[service-name]-service-in-sandbox
```

For example, for Tunnelbroker the command will look like this:

```
yarn run-tunnelbroker-service-in-sandbox
```

You can also run all services at once in the sandbox using the command below:

```
yarn run-all-services-in-sandbox
```

### Rebuilding the base image

If you ever wish to rebuild the base image, you should get a tool named [buildx](https://github.com/docker/buildx). It should be attached with the Docker desktop app on the macOS, but if you use Linux, you will probably need to install it manually. For the installation instructions, please go [here](https://github.com/docker/buildx#installing).
