use bytesize::ByteSize;
use commtest::blob::{
  blob_utils::{BlobData, BlobServiceClient},
  get, put, remove,
};
use commtest::tools::{obtain_number_of_threads, Error};
use std::env;
use tokio::runtime::Runtime;

#[tokio::test]
async fn blob_performance_test() -> Result<(), Error> {
  let port = env::var("COMM_SERVICES_PORT_BLOB")
    .expect("port env var expected but not received");
  let client =
    BlobServiceClient::connect(format!("http://localhost:{}", port)).await?;

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
        let mut client_cloned = client.clone();
        handlers.push(tokio::spawn(async move {
          let data_exists: bool =
            put::run(&mut client_cloned, &item_cloned).await.unwrap();
          assert!(!data_exists, "test data should not exist");
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
        let mut client_cloned = client.clone();
        handlers.push(tokio::spawn(async move {
          let received_sizes =
            get::run(&mut client_cloned, &item_cloned).await.unwrap();
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
        let mut client_cloned = client.clone();
        handlers.push(tokio::spawn(async move {
          remove::run(&mut client_cloned, &item_cloned).await.unwrap();
          assert!(
            get::run(&mut client_cloned, &item_cloned).await.is_err(),
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
