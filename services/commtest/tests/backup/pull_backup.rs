#[path = "./backup_utils.rs"]
mod backup_utils;
#[path = "../lib/tools.rs"]
mod tools;

use tonic::Request;

use crate::backup_utils::{
  proto::pull_backup_response::Data, proto::pull_backup_response::Data::*,
  proto::PullBackupRequest, BackupServiceClient,
};

use crate::backup_utils::{BackupData, Item};
use crate::tools::{Error, ATTACHMENT_DELIMITER};

#[derive(PartialEq, Debug)]
enum State {
  Compaction,
  Log,
}

pub async fn run(
  client: &mut BackupServiceClient<tonic::transport::Channel>,
  backup_data: &BackupData,
) -> Result<BackupData, Error> {
  println!("pull backup");
  let cloned_user_id = backup_data.user_id.clone();
  let cloned_backup_id = backup_data.backup_item.id.clone();

  let mut result = BackupData {
    user_id: String::new(),
    device_id: String::new(),
    backup_item: Item::new(String::new(), Vec::new(), Vec::new()),
    log_items: Vec::new(),
  };

  let response = client
    .pull_backup(Request::new(PullBackupRequest {
      user_id: cloned_user_id,
      backup_id: cloned_backup_id,
    }))
    .await?;
  let mut inbound = response.into_inner();
  let mut state: State = State::Compaction;
  let mut current_id: String = String::new();
  while let Some(response) = inbound.message().await? {
    let response_data: Option<Data> = response.data;
    let id = response.id;
    match response_data {
      Some(CompactionChunk(chunk)) => {
        assert!(
          state == State::Compaction,
          "invalid state, expected compaction, got {:?}",
          state
        );
        current_id = id;
        println!(
          "compaction (id {}), pushing chunk (size: {})",
          current_id,
          chunk.len()
        );
        result.backup_item.chunks_sizes.push(chunk.len())
      }
      Some(LogChunk(chunk)) => {
        if state == State::Compaction {
          state = State::Log;
        }
        assert!(state == State::Log, "invalid state, expected compaction");
        if id != current_id {
          result
            .log_items
            .push(Item::new(id.clone(), Vec::new(), Vec::new()));
          current_id = id.clone();
        }
        let log_items_size = result.log_items.len() - 1;
        result.log_items[log_items_size]
          .chunks_sizes
          .push(chunk.len());

        println!("log (id {}) chunk size {}", current_id, chunk.len());
      }
      Some(AttachmentHolders(holders)) => {
        let holders_split: Vec<&str> =
          holders.split(ATTACHMENT_DELIMITER).collect();
        if state == State::Compaction {
          println!("attachments for the backup: {}", holders);
          for holder in holders_split {
            if holder.len() == 0 {
              continue;
            }
            result
              .backup_item
              .attachments_holders
              .push(holder.to_string());
          }
        } else if state == State::Log {
          println!("attachments for the log: {}", holders);
          for holder in holders_split {
            if holder.len() == 0 {
              continue;
            }
            let log_items_size = result.log_items.len() - 1;
            result.log_items[log_items_size]
              .attachments_holders
              .push(holder.to_string())
          }
        }
      }
      None => {},
    }
  }
  Ok(result)
}
