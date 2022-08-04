#[path = "./backup/backup_utils.rs"]
mod backup_utils;
#[path = "./backup/talk.rs"]
mod talk;
#[path = "./lib/tools.rs"]
mod tools;

use std::env;

use tokio::runtime::Runtime;
use tools::{obtain_number_of_threads, Error};

use backup_utils::OuterServiceClient;

#[tokio::test]
async fn backup_performance_test() -> Result<(), Error> {
  let port = env::var("COMM_SERVICES_PORT_BACKUP")
    .expect("port env var expected but not received");
  let client =
    OuterServiceClient::connect(format!("http://localhost:{}", port)).await?;

  let number_of_threads = obtain_number_of_threads();

  println!(
    "Running performance tests for backup, number of threads: {}",
    number_of_threads
  );

  let mut backup_data = vec![];

  for i in 0..number_of_threads {
    backup_data.push((number_of_threads - i + 2) * 2);
  }

  let rt = Runtime::new().unwrap();
  tokio::task::spawn_blocking(move || {
    rt.block_on(async {
      println!("performing operations");
      let mut handlers = vec![];
      for item in backup_data {
        let item_cloned = item.clone();
        let mut client_cloned = client.clone();
        handlers.push(tokio::spawn(async move {
          talk::run(&mut client_cloned, item_cloned as usize)
            .await
            .unwrap();
        }));
      }
      // https://docs.rs/tokio/1.1.0/tokio/sync/mpsc/struct.Receiver.html#method.recv
      // The channel is closed when all senders have been dropped, or when close
      // is called. The best option here is to clone the sender for every
      // thread, drop the original one and let all the clones be dropped when
      // going out of scope which is equal to the parent thread's termination.

      for handler in handlers {
        handler.await.unwrap();
      }
    });
  })
  .await
  .expect("Task panicked");

  Ok(())
}
