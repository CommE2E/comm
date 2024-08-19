# Prerequisites

## Comm repo

You will need access to scripts and configuration files for deploying you self-hosted keyserver to AWS.

You can pull the Comm Git respository with the following commands:

```
git clone git@github.com:CommE2E/comm.git
```

## CLI tools

Setting up your own self-hosted keyserver on AWS will require several installations in your environment.

You can install them by using our provided Nix development shell.

You can install Nix by running our provided Nix installation script:

```
cd comm

./scripts/install_nix.sh
```

The Nix development shell can be run with:

```
# Create development shell
nix develop
```

This shell will provide all necessary tools in your environment.

Although we recommend using Nix, you can also install these dependencies yourself:

### Terraform

You will need [Terraform](https://www.terraform.io/) to deploy your keyserver configuration to AWS. Installation instructions can be found [here](https://www.terraform.io/downloads).

### Docker

To manage keyserver images, you will need to install [Docker](https://docs.docker.com/desktop/).

### AWS CLI

AWS CLI is necessary to query and manage your keyserver resources. You can find download instructions [here](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html).

### MariaDB

We use MariaDB through AWS RDS. You will need to install MariaDB to run queries with `mysql`. You can install MariaDB [here](https://mariadb.com/downloads/).

## Set up your AWS Account and CLI

You will need an AWS Account to deploy your keyserver to. You can get started at this [page](https://aws.amazon.com/resources/create-account/).

Once your AWS account has been properly set up, create an access key with these [steps](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html#Using_CreateAccessKey) under "To create an access key".

Make sure to copy down your `AWS Access Key ID` and `AWS Secret Access Key`.

You can now run `aws configure` and paste these values. Your default region name can be chosen from the following AWS provided [options](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.RegionsAndAvailabilityZones.html#Concepts.RegionsAndAvailabilityZones.Regions).

Ex. `us-east-1`

This is the region your keyserver will be deployed to.

Default output format can be entered past or picked from these [options](https://docs.aws.amazon.com/cli/v1/userguide/cli-usage-output-format.html#cli-usage-output-format-how).

Alternatively, if you expect to have multiple profiles, you can specify a new profile with `aws configure --profile new_keyserver_profile`.

You can also temporarily include your aws credentials in your environment by exporting them:

```
export AWS_ACCESS_KEY_ID="INSERT_ACCESS_KEY_ID_HERE"
export AWS_SECRET_ACCESS_KEY="INSERT_SECRET_ACCESS_KEY_HERE"
```

You can check that your credentials have been properly set up in your environment by receiving a successful response from running:

```
aws sts get-caller-identity
```

## Set up your `terraform.tf.vars.json`

In the Comm repo, navigate to to the self-host directory with

```
cd services/terraform/self-host/
```

Create a file called `terraform.tf.vars.json` with:

```
touch terraform.tf.vars.json
```

In the file, include these necessary variables

```
{
  "region": "us-east-1",
  "keyserver_domain_name": "your_keyserver_domain.com",
  "allowed_ips": ["68.312.392.93"],
}
```

### Region

Configure the region as the same region you set in `aws configure`.

If you set your AWS access keys in your environment through exporting your keys, choose one now.

You can refer back to these [AWS region options](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.RegionsAndAvailabilityZones.html#Concepts.RegionsAndAvailabilityZones.Regions)

### Keyserver Domain Name

Your `keyserver_domain_name` is the domain for which you want your keyserver to be accessed at.

You should own this domain through a registrar like [Squarespace](https://domains.squarespace.com/) or [Cloudflare](https://www.cloudflare.com/products/registrar/).

Your account through one of these domain registrars must provide the ability to add DNS records.

### Allowed IPs

Allowed ips allows you to specify your current ipv4 address and provide access to your AWS RDS database.

You can find your ip address by visiting `http://icanhazip.com/` or running the following curl command in your terminal:

```
ip_address="$(curl -s ipv4.wtfismyip.com/text)"
```

Copy and paste this value and insert into the `allowed_ips` list. This can be removed later after keyserver is up and running.

### Desired Secondary Nodes (Optional)

You can choose to scale your keyserver by running secondary nodes to accompany your primary node. You can specify how many secondary nodes you would like to run by configuring like so: `"desired_secondary_nodes": 2`

## Request SSL/TLS certificate for your keyserver domain

You will need to set up an SSL/TLS certificate for your above specified keyserver domain with AWS Certificate Manager.

You can visit the Certificate Manager in the AWS Console. We recommend using `RSA 2048` for encryption. You will also need to authenticate domain ownership using either email or creating new DNS records.

## Set up your `.env` file

In the `self-host` directory, also create a `.env` file. These environmental variables will be included in the environment of docker container running your keyserver.

The following is an example `.env` file:

```
COMM_LISTEN_ADDR=0.0.0.0
COMM_DATABASE_DATABASE=comm
COMM_DATABASE_USER=comm
COMM_DATABASE_PASSWORD=database_password

COMM_JSONCONFIG_secrets_user_credentials='{"username":"keyserver_username","password":"keyserver_password"}'
COMM_JSONCONFIG_facts_keyserver_url='{"baseDomain":"https://your_keyserver_domain.com", "basePath":"/", "baseRoutePath":"/", "https":true, "proxy":"aws" }'

COMM_JSONCONFIG_facts_webapp_cors='{"domain":"https://web.comm.app"}'
```

Each variable is required but should be modified with your own personal configuration values.

## Deploy terraform configuration to AWS

In the `self-host` directory, you can now run the `aws-deploy.sh` script with:

```
./aws-deploy.sh
```

You should see the following message:
`Would you like to initialize a fresh keyserver? (y/n)`

Answer `y` and terraform will begin applying.

On seeing the following message: 'Primary service is not healthy yet. Waiting 10 seconds before checking again...',
you will need to grab your keyserver load balancer's DNS name.

You can do so either by running the following command and copying the results or finding the DNS name in the AWS console under EC2, Load balancers, and `keyserver-service-lb`:

```
aws elbv2 describe-load-balancers --names keyserver-service-lb --query 'LoadBalancers[0].DNSName' --output text
```

On finding the DNS name, create an 'ALIAS' DNS record to point your domain to the load balancer DNS name at the root-level with your domain registrar.

Once the record has been properly propagated, the script should complete and your keyserver should be up and running.
