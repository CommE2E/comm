#[path = "./blob/blob_utils.rs"]
mod blob_utils;
#[path = "./blob/get.rs"]
mod get;
#[path = "./blob/put.rs"]
mod put;
#[path = "./blob/remove.rs"]
mod remove;
#[path = "./lib/tools.rs"]
mod tools;

use blob_utils::{BlobData, BlobServiceClient};
use tools::{get_grpc_chunk_size_limit as chunk_limit, Error};

#[tokio::test]
async fn blob_test() -> Result<(), Error> {
  let mut client = BlobServiceClient::connect("http://localhost:50053").await?;

  let blob_data = vec![
    BlobData {
      holder: "test_holder001".to_string(),
      hash: "test_hash001".to_string(),
      chunks_sizes: vec![100, 100, 100],
    },
    BlobData {
      holder: "test_holder002".to_string(),
      hash: "test_hash002".to_string(),
      chunks_sizes: vec![chunk_limit(), chunk_limit(), 10],
    },
    BlobData {
      holder: "test_holder003".to_string(),
      hash: "test_hash003".to_string(),
      chunks_sizes: vec![chunk_limit(), 100, chunk_limit()],
    },
  ];

  for item in &blob_data {
    let data_exists: bool = put::run(&mut client, &item).await?;
    assert!(!data_exists, "test data should not exist");
  }

  for i in 0..blob_data.len() {
    let received_sizes = get::run(&mut client, &blob_data[i]).await?;
    let expected_data_size = blob_data[i].chunks_sizes.iter().sum::<usize>();
    let received_data_size = received_sizes.iter().sum::<usize>();
    assert!(
      expected_data_size == received_data_size,
      "invalid size of data for index {}, expected {}, got {}",
      i,
      expected_data_size,
      received_data_size
    );
  }

  for item in &blob_data {
    remove::run(&mut client, &item).await?;
  }

  Ok(())
}
