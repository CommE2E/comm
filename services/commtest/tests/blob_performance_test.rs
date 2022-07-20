#[path = "./blob/blob_utils.rs"]
mod blob_utils;
#[path = "./lib/tools.rs"]
mod tools;

use bytesize::ByteSize;

use tokio::runtime::Runtime;
use tools::{obtain_number_of_threads, Error};

use blob_utils::BlobData;

#[tokio::test]
async fn blob_performance_test() -> Result<(), Error> {
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
    });

    // GET
    rt.block_on(async {
      println!("performing GET operations");
    });

    // REMOVE
    rt.block_on(async {
      println!("performing REMOVE operations");
    });
  })
  .await
  .expect("Task panicked");

  Ok(())
}
