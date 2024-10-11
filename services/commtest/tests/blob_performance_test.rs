use bytesize::ByteSize;
use commtest::tools::{obtain_number_of_threads, Error};
use commtest::{
  blob::{
    blob_utils::{BlobData, BlobServiceClient},
    get, put, remove,
  },
  service_addr,
};
use tokio::runtime::Runtime;

#[tokio::test]
async fn blob_performance_test() -> Result<(), Error> {
  let url = reqwest::Url::try_from(service_addr::BLOB_SERVICE_HTTP)
    .expect("failed to parse blob service url");
  let client = BlobServiceClient::new(url);

  let number_of_threads = obtain_number_of_threads();

  println!(
    "Running performance tests for blob, number of threads: {}",
    number_of_threads
  );

  let mut blob_data = vec![];

  for i in 0..number_of_threads {
    let index: u64 = (i as u64) % 10;
    blob_data.push(BlobData {
      holder: format!("test_holder_{}", i),
      hash: format!("test_hash_{}", i),
      chunks_sizes: vec![
        ByteSize::kib(200 + (300 - index * 20)).as_u64() as usize,
        ByteSize::kib(500 + (400 - index * 20)).as_u64() as usize,
        ByteSize::kib(700 + (500 - index * 25)).as_u64() as usize,
      ],
    })
  }

  let rt = Runtime::new().unwrap();
  tokio::task::spawn_blocking(move || {
    // PUT
    rt.block_on(async {
      println!("performing PUT operations");
      let mut handlers = vec![];
      for item in &blob_data {
        let item_cloned = item.clone();
        let client_cloned = client.clone();
        handlers.push(tokio::spawn(async move {
          let result = put::run(&client_cloned, &item_cloned).await.unwrap();
          assert!(result.blob_was_uploaded(), "test data should not exist");
        }));
      }

      for handler in handlers {
        handler.await.unwrap();
      }
    });

    // GET
    rt.block_on(async {
      println!("performing GET operations");
      let mut handlers = vec![];

      for (i, item) in blob_data.iter().enumerate() {
        let item_cloned = item.clone();
        let client_cloned = client.clone();
        handlers.push(tokio::spawn(async move {
          let received_sizes =
            get::run(&client_cloned, &item_cloned).await.unwrap();
          let expected_data_size =
            item_cloned.chunks_sizes.iter().sum::<usize>();
          let received_data_size = received_sizes.iter().sum::<usize>();
          assert_eq!(
            expected_data_size, received_data_size,
            "invalid size of data for index {}, expected {}, got {}",
            i, expected_data_size, received_data_size
          );
        }));
      }

      for handler in handlers {
        handler.await.unwrap();
      }
    });

    // REMOVE
    rt.block_on(async {
      println!("performing REMOVE operations");
      let mut handlers = vec![];

      for item in &blob_data {
        let item_cloned = item.clone();
        let client_cloned = client.clone();
        handlers.push(tokio::spawn(async move {
          remove::run(&client_cloned, &item_cloned).await.unwrap();
          assert!(
            get::run(&client_cloned, &item_cloned).await.is_err(),
            "item should no longer be available"
          );
        }));
      }

      for handler in handlers {
        handler.await.unwrap();
      }
    });
  })
  .await
  .expect("Task panicked");

  Ok(())
}
