use std::sync::{Arc, Mutex};
use tracing::error;

pub fn report_error(
  error_messages: &Arc<Mutex<Vec<String>>>,
  message: &str,
  label_provided: Option<&str>,
) {
  let label = match label_provided {
    Some(value) => format!("[{}]", value),
    None => "".to_string(),
  };
  println!("[RUST] {} Error: {}", label, message);
  if let Ok(mut error_messages_unpacked) = error_messages.lock() {
    error_messages_unpacked.push(message.to_string());
  }
  error!("could not access error messages");
}
