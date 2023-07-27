use bytesize::ByteSize;
use commtest::blob::{
  blob_utils::{BlobData, BlobServiceClient},
  constants::NO_RANGE,
  get, put, remove,
};
use commtest::constants;
use commtest::tools::Error;
use std::{env, ops::RangeBounds};

async fn run_http_range_test(
  client: &BlobServiceClient,
  blob_item: &BlobData,
  range: impl RangeBounds<i64>,
) -> Result<(), Error> {
  let blob_size: i64 = blob_item
    .chunks_sizes
    .iter()
    .sum::<usize>()
    .try_into()
    .unwrap();
  let end_range = match range.end_bound() {
    std::ops::Bound::Included(end) => *end,
    std::ops::Bound::Excluded(end) => *end - 1,
    std::ops::Bound::Unbounded => blob_size - 1,
  };
  let start_range = match range.start_bound() {
    std::ops::Bound::Included(start) => *start,
    std::ops::Bound::Excluded(start) => *start + 1,
    std::ops::Bound::Unbounded => {
      // HTTP Range with defined end_range only will take the last N bytes
      // of the blob, so we need to add one byte to match the expected_data_size calculation
      (end_range < blob_size - 1) as i64
    }
  };

  // For invalid ranges, the expected data size is the whole blob
  let expected_data_size = if start_range >= 0 && start_range <= end_range {
    end_range - start_range + 1
  } else {
    blob_size
  };

  match get::run(&client, &blob_item, Some(&range)).await {
    Ok(received_sizes) => {
      let received_data_size: i64 =
        received_sizes.iter().sum::<usize>().try_into().unwrap();
      if expected_data_size != received_data_size {
        Err(Error::AssertError(format!(
          "invalid size of data for range {}-{}, expected {}, got {}",
          start_range, end_range, expected_data_size, received_data_size
        )))?;
      }
      Ok(())
    }
    Err(Error::HttpStatus(reqwest::StatusCode::RANGE_NOT_SATISFIABLE)) => {
      if start_range >= blob_size || end_range >= blob_size {
        return Ok(());
      }
      Err(Error::AssertError(format!(
        "invalid HTTP Range {}-{}",
        start_range, end_range
      )))?
    }
    Err(e) => Err(e)?,
  }
}

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
    let received_sizes = get::run(&client, &blob_item, NO_RANGE).await?;
    let expected_data_size = blob_item.chunks_sizes.iter().sum::<usize>();
    let received_data_size: usize = received_sizes.iter().sum::<usize>();
    if expected_data_size != received_data_size {
      Err(Error::AssertError(format!(
        "invalid size of data for index {}, expected {}, got {}",
        i, expected_data_size, received_data_size
      )))?;
    }
  }

  // Test HTTP Range header
  let blob_item = &blob_data[0];
  let blob_size: i64 = blob_item
    .chunks_sizes
    .iter()
    .sum::<usize>()
    .try_into()
    .unwrap();
  // Valid ranges
  run_http_range_test(client, blob_item, 0..blob_size).await?;
  run_http_range_test(client, blob_item, 5..26).await?;
  run_http_range_test(client, blob_item, 5..6).await?;
  run_http_range_test(client, blob_item, 40..).await?;
  run_http_range_test(client, blob_item, ..40).await?;
  // 416 Range Not Satisfiable
  run_http_range_test(client, blob_item, 0..blob_size + 1).await?;
  run_http_range_test(client, blob_item, ..blob_size + 1).await?;
  run_http_range_test(client, blob_item, blob_size + 1..).await?;
  // Invalid ranges (should return the whole data)
  run_http_range_test(client, blob_item, 31..21).await?;
  run_http_range_test(client, blob_item, -5..).await?;
  run_http_range_test(client, blob_item, ..-5).await?;
  run_http_range_test(client, blob_item, ..).await?;

  for (i, item) in blob_data.iter().enumerate() {
    remove::run(&client, &item).await?;
    if get::run(&client, &item, NO_RANGE).await.is_ok() {
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
