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

use bytesize::ByteSize;
use std::env;

use blob_utils::{BlobData, BlobServiceClient};
use tools::Error;

#[tokio::test]
async fn blob_test() -> Result<(), Error> {
  let port = env::var("COMM_SERVICES_PORT_BLOB")
    .expect("port env var expected but not received");
  let mut client =
    BlobServiceClient::connect(format!("http://localhost:{}", port)).await?;

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
        tools::get_grpc_chunk_size_limit(),
        tools::get_grpc_chunk_size_limit(),
        ByteSize::b(10).as_u64() as usize,
      ],
    },
    BlobData {
      holder: "test_holder003".to_string(),
      hash: "test_hash003".to_string(),
      chunks_sizes: vec![
        tools::get_grpc_chunk_size_limit(),
        ByteSize::b(100).as_u64() as usize,
        tools::get_grpc_chunk_size_limit(),
      ],
    },
  ];

  for item in &blob_data {
    let data_exists: bool = put::run(&mut client, &item).await?;
    assert!(!data_exists, "test data should not exist");
  }

  for (i, blob_item) in blob_data.iter().enumerate() {
    let received_sizes = get::run(&mut client, &blob_item).await?;
    let expected_data_size = blob_item.chunks_sizes.iter().sum::<usize>();
    let received_data_size = received_sizes.iter().sum::<usize>();
    assert_eq!(
      expected_data_size, received_data_size,
      "invalid size of data for index {}, expected {}, got {}",
      i, expected_data_size, received_data_size
    );
  }

  for item in &blob_data {
    remove::run(&mut client, &item).await?;
    assert!(
      get::run(&mut client, &item).await.is_err(),
      "item should no longer be available"
    );
  }

  Ok(())
}
