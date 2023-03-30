# Services workflows

## Running the Identity service

Generate the server keypair used by the `opaque-ke` crate for registration and login. You only need to do this once.

```
cd services/identity
cargo run keygen
```

You’re now ready to run the Identity service:

```
cargo run server
```

## Debugging

### AWS CLI

You can use the AWS CLI to inspect tables in your LocalStack DynamoDB instance.

To describe the table structure:

```
aws dynamodb describe-table --table-name your-table --endpoint-url http://localhost:4566
```

Replace `your-table` with the name of the table you would like to inspect.

To query the table and list all the items:

```
aws dynamodb scan --table-name your-table --endpoint-url http://localhost:4566
```

Again, replace `your-table` with the name of the name of the table you would like to inspect.

These commands will give you an overview of your table’s structure and contents in LocalStack DynamoDB.
