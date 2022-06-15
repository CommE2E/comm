#[path = "./backup_utils.rs"]
mod backup_utils;
#[path = "../lib/tools.rs"]
mod tools;

use crate::backup_utils::{
  proto::send_log_request::Data::*, proto::SendLogRequest, BackupServiceClient,
};

use tonic::Request;

use crate::backup_utils::BackupData;
use crate::tools::generate_nbytes;
use crate::tools::Error;

pub async fn run(
  client: &mut BackupServiceClient<tonic::transport::Channel>,
  backup_data: &BackupData,
  log_index: usize,
) -> Result<String, Error> {
  println!("send log");
  let cloned_user_id = backup_data.user_id.clone();
  let cloned_backup_id = backup_data.backup_item.id.clone();
  let cloned_log_sizes = backup_data.log_items[log_index].chunks_sizes.clone();
  let outbound = async_stream::stream! {
    println!(" - sending user id");
    let request = SendLogRequest {
      data: Some(UserId(cloned_user_id)),
    };
    yield request;
    println!(" - sending backup id");
    let request = SendLogRequest {
      data: Some(BackupId(cloned_backup_id)),
    };
    yield request;
    println!(" - sending log hash");
    let request = SendLogRequest {
      data: Some(LogHash(vec![65,66,67,66+(log_index as u8)])),
    };
    yield request;
    println!(" - sending log data");
    for log_size in cloned_log_sizes {
      println!("  - sending log data {}", log_size);
      let request = SendLogRequest {
        data: Some(LogData(generate_nbytes(log_size, None))),
      };
      yield request;
    }
  };

  let response = client.send_log(Request::new(outbound)).await?;
  let inbound = response.into_inner();
  println!("send log response: {:?}", inbound.log_checkpoint);
  Ok(inbound.log_checkpoint)
}
