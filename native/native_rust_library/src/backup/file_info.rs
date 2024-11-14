use lazy_static::lazy_static;
use regex::Regex;
use std::path::PathBuf;

lazy_static! {
  static ref BACKUP_DATA_FILE_REGEX: Regex = Regex::new(
      r"^backup-(?<backup_id>[^-]*)(-userkeys)?(?:-log-(?<log_id>\d*))?(?<additional_data>-attachments)?$"
    )
    .expect("Regex compilation failed");
}

#[derive(Debug)]
pub struct BackupFileInfo {
  pub backup_id: String,
  pub log_id: Option<usize>,
  pub additional_data: Option<String>,
}

impl TryFrom<PathBuf> for BackupFileInfo {
  type Error = ();

  fn try_from(value: PathBuf) -> Result<Self, Self::Error> {
    let Some(file_name) = value.file_name() else {
      return Err(());
    };
    let file_name = file_name.to_string_lossy();

    let Some(captures) = BACKUP_DATA_FILE_REGEX.captures(&file_name) else {
      return Err(());
    };

    let Some(backup_id) = captures
      .name("backup_id")
      .map(|re_match| re_match.as_str().to_string())
    else {
      // Should never happen happen because regex matched the filename
      println!(
        "Couldn't parse 'backup_id' from backup filename: {file_name:?}"
      );
      return Err(());
    };

    let log_id = match captures
      .name("log_id")
      .map(|re_match| re_match.as_str().parse::<usize>())
    {
      None => None,
      Some(Ok(log_id)) => Some(log_id),
      Some(Err(err)) => {
        // Should never happen happen because regex matched the filename
        println!(
          "Couldn't parse 'log_id' from backup filename: {file_name:?}. \
          Error: {err:?}"
        );
        return Err(());
      }
    };

    let additional_data = captures
      .name("additional_data")
      .map(|m| m.as_str().to_string());

    Ok(Self {
      backup_id,
      log_id,
      additional_data,
    })
  }
}
