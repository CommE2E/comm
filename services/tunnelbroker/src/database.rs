use aws_config::SdkConfig;
use aws_sdk_dynamodb::Client;
use std::sync::Arc;

#[derive(Clone)]
pub struct DatabaseClient {
  client: Arc<Client>,
}

impl DatabaseClient {
  pub fn new(aws_config: &SdkConfig) -> Self {
    let client = Client::new(aws_config);

    DatabaseClient {
      client: Arc::new(client),
    }
  }
}
