# Self-hosting a keyserver on AWS

## Comm repo

You will need access to scripts and configuration files for deploying your self-hosted keyserver to AWS.

You can pull the Comm Git repository with the following commands:

```
git clone git@github.com:CommE2E/comm.git
```

## CLI tools

We have several prerequisites for running the scripts and Terraform logic that will help you manage your keyserver on AWS.

These prerequisites are all packaged together in our provided Nix development shell.

You can install Nix by running our provided Nix installation script:

```
cd comm

./scripts/install_nix.sh
```

The Nix development shell can be run with:

```
nix develop
```

This shell will provide all the necessary tools in your environment.

Although we recommend using Nix, you can also install these dependencies yourself:

### Terraform

You will need [Terraform](https://www.terraform.io/) to deploy your keyserver configuration to AWS. Installation instructions can be found [here](https://www.terraform.io/downloads).

### AWS CLI

AWS CLI is necessary to query and manage your keyserver resources. You can find download instructions [here](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html).

### MariaDB

We use MariaDB through AWS RDS. You will need to install MariaDB to run queries with `mysql`. You can install MariaDB [here](https://mariadb.com/downloads/).

## Set up your AWS account and CLI

You will need an AWS Account to deploy your keyserver to. You can get started at [this page](https://aws.amazon.com/resources/create-account/).

Once your AWS account has been properly set up, create an access key with [these steps](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html#Using_CreateAccessKey) under "To create an access key".

Make sure to copy down your `AWS Access Key ID` and `AWS Secret Access Key`.

You can now run `aws configure` and paste these values. Your default region name can be chosen from the [AWS provided options](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.RegionsAndAvailabilityZones.html#Concepts.RegionsAndAvailabilityZones.Regions).

The default output format can be skipped past or picked from [these options](https://docs.aws.amazon.com/cli/v1/userguide/cli-usage-output-format.html#cli-usage-output-format-how).

Alternatively, if you expect to have multiple profiles, you can specify a new profile with `aws configure --profile new_keyserver_profile`.

You can also temporarily include your AWS credentials in your environment by exporting them:

```
export AWS_ACCESS_KEY_ID="INSERT_ACCESS_KEY_ID_HERE"
export AWS_SECRET_ACCESS_KEY="INSERT_SECRET_ACCESS_KEY_HERE"
export AWS_REGION="INSERT_REGION_HERE"
```

You can check that your credentials have been properly set up in your environment by receiving a successful response from running:

```
aws sts get-caller-identity
```

## Set up your `terraform.tf.vars.json`

In the Comm repo, navigate to the self-host directory with:

```
cd services/terraform/self-host
```

Create a file called `terraform.tf.vars.json` with your preferred text editor.

In the file, include these necessary variables:

```
{
  "region": "us-east-1",
  "keyserver_domain_name": "your_keyserver_domain.com",
  "allowed_ips": ["68.312.392.93"],
}
```

### Region

Configure the region as the same region you set in `aws configure`.

### Keyserver domain name

`keyserver_domain_name` is the domain your keyserver will be accessed at.

You'll need to be able to edit DNS records for this domain. Your domain registrar should support root-level `ALIAS` or `CNAME` records.

If these features are unavailable on your current domain registrar, consider a move of your DNS management to AWS Route53 which provides default support.

### Allowed IPs

`allowed_ips` is for allowlisting a set of IPv4 addresses for access to your RDS database. It's necessary to include the IPv4 you're calling AWS from so that we can allow the scripts running on your computer to talk to the RDS database.

You can find your IPv4 address by running the following curl command in your terminal:

```
curl -s ipv4.wtfismyip.com/text
```

### Desired secondary nodes (optional)

You can choose to scale your keyserver by running secondary nodes to accompany your primary node. You can specify how many secondary nodes you would like to run by configuring like so:

```
"desired_secondary_nodes": 2
```

## Request SSL/TLS certificate for your keyserver domain

You will need to set up an SSL/TLS certificate for your keyserver domain with AWS Certificate Manager.

You can visit the Certificate Manager in the AWS Console. We recommend using `RSA 2048` for encryption. You will also need to authenticate domain ownership using either email or creating new DNS records.

## Set up your `.env` file

In the `self-host` directory, also create a `.env` file. These environmental variables will be included in the environment of the Docker container running your keyserver.

### Environmental variables that need configuring

#### Credential variables

```
COMM_DATABASE_USER=comm
COMM_DATABASE_PASSWORD=database_password
COMM_JSONCONFIG_secrets_user_credentials='{"username":"","password":""}'
```

- Set your database username and password through `COMM_DATABASE_USER` and `COMM_DATABASE_PASSWORD`.
- Configure your keyserver's username and password by inserting them into the empty fields in `COMM_JSONCONFIG_secrets_user_credentials`.

#### Domain variables

```
COMM_JSONCONFIG_facts_keyserver_url='{"baseDomain":"https://your_keyserver_domain.com", "basePath":"/", "baseRoutePath":"/", "https":true, "proxy":"aws" }'
```

- Only modify the empty field under `baseDomain` with your chosen keyserver domain.

#### Keys

In the following environmental variables, insert your keys in the empty fields.

Include your Alchemy key which is necessary for ENS support. You can receive one from Alchemy's [website](https://www.alchemy.com/).

```
COMM_JSONCONFIG_secrets_alchemy='{"key":""}'
```

Include your WalletConnect key which is necessary for registration/login with crypto wallets. You can receive one from WalletConnect's [website](https://walletconnect.com/).

```
COMM_JSONCONFIG_secrets_walletconnect='{"key":""}'
```

Include your Neynar key which is necessary for Farcaster integration. You can receive your key from Neynar's [website](https://neynar.com/#pricing).

```
COMM_JSONCONFIG_secrets_neynar='{"key":""}'
```

Include your GeoIP license used to map user IPs to time zones. You can receive one from MaxMind's [website](https://www.maxmind.com/en/home).

```
COMM_JSONCONFIG_secrets_geoip_license='{"key":""}'
```

#### Notification configs

The token values specified in your Comm APN config are used to send push notifications to iOS.

You will need to configure a p8 token-based key. Further instructions can be found [here](https://developer.apple.com/documentation/usernotifications/establishing-a-token-based-connection-to-apns).

The value for `key` should be the text from your `.p8` file. `keyID` should also be received by following the above Apple developer instructions. Team ID can be found under Membership details. `production` remains `true`.

```
COMM_JSONCONFIG_secrets_comm_apn_config='{ "token": { "key": "", "keyId": "", "teamId": "" }, "production": true }'
```

The Comm FCM config is used for Android push notifications. These config values are received through setting up a [Firebase project](https://console.firebase.google.com/). Under Project settings → Service accounts, you can generate a new private key. This will result in downloading a `.json` file.

The file's JSON contents should be included as `COMM_JSONCONFIG_secrets_comm_fcm_config`'s field enclosed in `''` like so:

```
COMM_JSONCONFIG_secrets_comm_fcm_config='{ "type": "service_account", "project_id": "", "private_key_id": "", "private_key": "", "client_email": "", "client_id": "", "auth_uri": "", "token_uri": "", "auth_provider_x509_cert_url": "", "client_x509_cert_url": "" }'
```

The web push config is used for web application notifications. You can generate the necessary `publicKey` and `privateKey` with the [web-push library](https://github.com/web-push-libs/web-push).

You can run `npm install web-push -g` to install `web-push` globally and generate the necessary keys with `web-push generate-vapid-keys --json`. The resulting json can be included as the web push config value like so:

```
COMM_JSONCONFIG_secrets_web_push_config='{"publicKey":"","privateKey":""}'
```

The WNS Config is used for notifications on Windows. To obtain the `tenantID`, `appID`, and `secret` values, you will need an [Azure account](https://azure.microsoft.com).

Follow steps 1-3 in the [Microsoft push notifications quickstart tutorial](https://learn.microsoft.com/en-us/windows/apps/windows-app-sdk/notifications/push-notifications/push-quickstart?source=recommendations#configure-your-apps-identity-in-azure-active-directory-aad).

You will receive the `tenantID` as `Directory (tenant) ID` and `appID` as `Application (client) ID` in step 2. The `secret` field will be from your generated client secret's value in step 3.

```
COMM_JSONCONFIG_secrets_wns_config='{"tenantID": "", "appID": "", "secret": ""}'
```

### Environmental variables to remain unchanged

These variables should be copied and pasted into your `.env` file unchanged:

```
COMM_DATABASE_DATABASE=comm
COMM_LISTEN_ADDR=0.0.0.0
COMM_JSONCONFIG_facts_webapp_cors='{"domain":"https://web.comm.app"}'
```

## Deploy terraform configuration to AWS

In the `self-host` directory, you can now run the `aws-deploy.sh` script with:

```
./aws-deploy.sh
```

You should see the following message:

```
Would you like to initialize a fresh keyserver? (y/n)`
```

Answer `y` and Terraform will begin setting up your keyserver.

On seeing the following message: `Primary service is not healthy yet. Waiting 10 seconds before checking again...`,
you will need to grab your keyserver load balancer's DNS name.

You can find your keyserver's DNS name either through the AWS console under EC2 → Load balancers → keyserver-service-lb, or by running the following command:

```
aws elbv2 describe-load-balancers --names keyserver-service-lb --query 'LoadBalancers[0].DNSName' --output text
```

On finding the DNS name, create an `ALIAS` or `CNAME` DNS record to point your domain to the load balancer DNS name at the root-level with your domain registrar.

If you are configuring your DNS rules through AWS Route53 (on the same account as your keyserver is deployed on), you can create an `A` record through the "Quick create record" menu, selecting `Alias` and your keyserver load balancer's DNS name.

Once the record has been properly propagated, your keyserver should be accessible at your provided domain.

You can confirm it is accepting traffic with the following command which should provide a `200 OK` response:

```
curl https://keyserver_domain_name/health
```
