use std::path::{Path, PathBuf};

pub mod future_manager;
pub mod jsi_callbacks;

pub fn schedule_remove_file(path: &Path) {
  let path = PathBuf::from(path);
  tokio::spawn(async move {
    if let Err(err) = tokio::fs::remove_file(&path).await {
      println!("Failed to remove file {0}: {err:?}", path.to_string_lossy());
    }
  });
}
