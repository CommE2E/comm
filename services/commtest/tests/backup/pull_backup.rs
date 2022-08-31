#[path = "./backup_utils.rs"]
mod backup_utils;
#[path = "../lib/tools.rs"]
mod tools;

use std::io::{Error as IOError, ErrorKind};
use tonic::Request;

use crate::backup_utils::{
  proto::pull_backup_response::Data, proto::pull_backup_response::Data::*,
  proto::pull_backup_response::Id, proto::pull_backup_response::Id::*,
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
    let id: Option<Id> = response.id;
    let mut backup_id: Option<String> = None;
    let mut log_id: Option<String> = None;
    match id {
      Some(BackupId(id)) => backup_id = Some(id),
      Some(LogId(id)) => log_id = Some(id),
      None => {}
    };
    match response_data {
      Some(CompactionChunk(chunk)) => {
        assert_eq!(
          state,
          State::Compaction,
          "invalid state, expected compaction, got {:?}",
          state
        );
        current_id = backup_id.ok_or(IOError::new(
          ErrorKind::Other,
          "backup id expected but not received",
        ))?;
        println!(
          "compaction (id {}), pulling chunk (size: {})",
          current_id,
          chunk.len()
        );
        result.backup_item.chunks_sizes.push(chunk.len())
      }
      Some(LogChunk(chunk)) => {
        if state == State::Compaction {
          state = State::Log;
        }
        assert_eq!(
          state,
          State::Log,
          "invalid state, expected log, got {:?}",
          state
        );
        let log_id = log_id.ok_or(IOError::new(
          ErrorKind::Other,
          "log id expected but not received",
        ))?;
        if log_id != current_id {
          result.log_items.push(Item::new(
            log_id.clone(),
            Vec::new(),
            Vec::new(),
          ));
          current_id = log_id;
        }
        let log_items_size = result.log_items.len() - 1;
        result.log_items[log_items_size]
          .chunks_sizes
          .push(chunk.len());

        println!("log (id {}) chunk size {}", current_id, chunk.len());
      }
      None => {}
    }
    if let Some(holders) = response.attachment_holders {
      let holders_split: Vec<&str> =
        holders.split(ATTACHMENT_DELIMITER).collect();
      if state == State::Compaction {
        for holder in holders_split {
          if holder.len() == 0 {
            continue;
          }
          println!("attachments for the backup: {}", holder);
          result
            .backup_item
            .attachments_holders
            .push(holder.to_string());
        }
      } else if state == State::Log {
        for holder in holders_split {
          if holder.len() == 0 {
            continue;
          }
          println!("attachments for the log: {}", holders);
          let log_items_size = result.log_items.len() - 1;
          result.log_items[log_items_size]
            .attachments_holders
            .push(holder.to_string())
        }
      }
    }
  }
  Ok(result)
}
