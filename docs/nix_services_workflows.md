# Services workflows

## Running the Identity service

First, make sure that you've installed Docker (see the [services prerequisites](./nix_services_setup.md#docker) for more information).

Then, start LocalStack if you haven't already:

```
comm-dev services start
```

Make sure your LocalStack resources are up to date:

```
cd services/terraform
./run.sh
```

Next, generate the server keypair used by the `opaque-ke` crate for registration and login. You only need to do this once.

```
cd ../services/identity
cargo run keygen
```

You're now ready to run the Identity service:

```
cargo run server
```
