use crate::backup::backup_utils::{
  proto::{send_log_request::Data::*, SendLogRequest},
  BackupData, BackupServiceClient,
};
use crate::tools::{generate_stable_nbytes, DataHasher, Error};
use tonic::Request;

pub async fn run(
  client: &mut BackupServiceClient<tonic::transport::Channel>,
  backup_data: &BackupData,
  log_index: usize,
) -> Result<String, Error> {
  println!("send log");
  let cloned_user_id = backup_data.user_id.clone();
  let cloned_backup_id = backup_data.backup_item.id.clone();
  let cloned_log_sizes = backup_data.log_items[log_index].chunks_sizes.clone();
  let predefined_byte_value = None;
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
    let mut hasher = DataHasher::new();
    for chunk_size in &cloned_log_sizes {
      DataHasher::update(&mut hasher, generate_stable_nbytes(*chunk_size, predefined_byte_value));
    }

    let request = SendLogRequest {
      data: Some(LogHash(hasher.get_hash().as_bytes().to_vec())),
    };
    yield request;
    println!(" - sending log data");
    for log_size in &cloned_log_sizes {
      println!("  - sending log data {}", *log_size);
      let request = SendLogRequest {
        data: Some(LogData(generate_stable_nbytes(*log_size, predefined_byte_value))),
      };
      yield request;
    }
  };

  let response = client.send_log(Request::new(outbound)).await?;
  let inbound = response.into_inner();
  println!("send log response: {:?}", inbound.log_checkpoint);
  Ok(inbound.log_checkpoint)
}
