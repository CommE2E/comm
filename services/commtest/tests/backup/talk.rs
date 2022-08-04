#[path = "./backup_utils.rs"]
mod backup_utils;
#[path = "../lib/tools.rs"]
mod tools;

use crate::backup_utils::{proto::TalkWithClientRequest, BackupServiceClient};

use tonic::Request;

use crate::tools::{generate_nbytes, Error};

pub async fn run(
  client: &mut BackupServiceClient<tonic::transport::Channel>,
  backup_data: usize,
) -> Result<(), Error> {
  println!("talk...");
  let outbound = async_stream::stream! {
    for i in 0..backup_data {
      let size = i*100+100;
      println!(" - sending user msg index {}, size: {}", i, size);
      let req = TalkWithClientRequest {
        msg: String::from_utf8(generate_nbytes(size, None)).unwrap()
      };
      yield req;
    }
  };

  let response = client.talk_with_client(Request::new(outbound)).await?;
  let mut inbound = response.into_inner();
  while let Some(response) = inbound.message().await? {
    println!("got response: {}", response.msg);
  }
  Ok(())
}
