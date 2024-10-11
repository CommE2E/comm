use bytesize::ByteSize;
use commtest::constants;
use commtest::tools::Error;
use commtest::{
  blob::{
    blob_utils::{BlobData, BlobServiceClient},
    get, put, remove,
  },
  service_addr,
};

#[tokio::test]
async fn blob_integration_test() -> Result<(), Error> {
  let url = reqwest::Url::try_from(service_addr::BLOB_SERVICE_HTTP)
    .expect("failed to parse blob service url");
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

  for item in &blob_data {
    let result = put::run(&client, item).await?;
    assert!(result.blob_was_uploaded(), "test data should not exist");
  }

  for (i, blob_item) in blob_data.iter().enumerate() {
    let received_sizes = get::run(&client, blob_item).await?;
    let expected_data_size = blob_item.chunks_sizes.iter().sum::<usize>();
    let received_data_size = received_sizes.iter().sum::<usize>();
    assert_eq!(
      expected_data_size, received_data_size,
      "invalid size of data for index {}, expected {}, got {}",
      i, expected_data_size, received_data_size
    );
  }

  for item in &blob_data {
    remove::run(&client, item).await?;
    assert!(
      get::run(&client, item).await.is_err(),
      "item should no longer be available"
    );
  }

  Ok(())
}
