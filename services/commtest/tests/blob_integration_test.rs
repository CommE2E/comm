use bytesize::ByteSize;
use commtest::blob::{
  blob_utils::{BlobData, BlobServiceClient},
  get, put, remove,
};
use commtest::constants;
use commtest::tools::Error;
use std::env;

async fn run_blob_integration_test(
  client: &BlobServiceClient,
  blob_data: &Vec<BlobData>,
) -> Result<(), Error> {
  for (i, item) in blob_data.iter().enumerate() {
    let data_exists: bool = put::run(&client, &item).await?;
    if data_exists {
      Err(Error::AssertError(format!(
        "test data no. {} should not exist",
        i
      )))?;
    }
  }

  for (i, blob_item) in blob_data.iter().enumerate() {
    let received_sizes = get::run(&client, &blob_item).await?;
    let expected_data_size = blob_item.chunks_sizes.iter().sum::<usize>();
    let received_data_size: usize = received_sizes.iter().sum::<usize>();
    if expected_data_size != received_data_size {
      Err(Error::AssertError(format!(
        "invalid size of data for index {}, expected {}, got {}",
        i, expected_data_size, received_data_size
      )))?;
    }
  }

  for (i, item) in blob_data.iter().enumerate() {
    remove::run(&client, &item).await?;
    if get::run(&client, &item).await.is_ok() {
      Err(Error::AssertError(format!(
        "test data no. {} should no longer be available",
        i
      )))?;
    }
  }

  Ok(())
}

#[tokio::test]
async fn blob_integration_test() -> Result<(), Error> {
  let port = env::var("COMM_SERVICES_PORT_BLOB")
    .expect("port env var expected but not received")
    .parse()
    .expect("port env var should be a number");
  let mut url = reqwest::Url::parse("http://localhost")?;
  url.set_port(Some(port)).expect("failed to set port");
  let client = BlobServiceClient::new(url);

  let blob_data = vec![
    BlobData {
      holder: "test_holder001".to_string(),
      hash: "test_hash001".to_string(),
      chunks_sizes: vec![
        ByteSize::b(100).as_u64() as usize,
        ByteSize::b(100).as_u64() as usize,
        ByteSize::b(100).as_u64() as usize,
      ],
    },
    BlobData {
      holder: "test_holder002".to_string(),
      hash: "test_hash002".to_string(),
      chunks_sizes: vec![
        *constants::GRPC_CHUNK_SIZE_LIMIT,
        *constants::GRPC_CHUNK_SIZE_LIMIT,
        ByteSize::b(10).as_u64() as usize,
      ],
    },
    BlobData {
      holder: "test_holder003".to_string(),
      hash: "test_hash003".to_string(),
      chunks_sizes: vec![
        *constants::GRPC_CHUNK_SIZE_LIMIT,
        ByteSize::b(100).as_u64() as usize,
        *constants::GRPC_CHUNK_SIZE_LIMIT,
      ],
    },
  ];

  let tests_result = run_blob_integration_test(&client, &blob_data).await;
  if tests_result.is_err() {
    // Clean up the data if any test fails
    for (i, item) in blob_data.iter().enumerate() {
      if remove::run(&client, &item).await.is_err() {
        Err(Error::AssertError(format!(
          "failed to clean test data no. {}",
          i
        )))?;
      }
    }
  }
  tests_result?;

  Ok(())
}
