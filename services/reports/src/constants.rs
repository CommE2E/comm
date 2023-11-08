pub const REPORT_LIST_DEFAULT_PAGE_SIZE: u32 = 20;
pub const REQUEST_BODY_JSON_SIZE_LIMIT: usize = 10 * 1024 * 1024; // 10MB

pub fn max_report_size() -> usize {
  let size = std::env::var("MAX_REPORT_SIZE")
    .ok()
    .and_then(|s| s.parse::<usize>().ok())
    .unwrap_or(REQUEST_BODY_JSON_SIZE_LIMIT);

  if size != REQUEST_BODY_JSON_SIZE_LIMIT {
    tracing::info!("MAX_REPORT_SIZE is set to {} bytes", size);
  }
  size
}
