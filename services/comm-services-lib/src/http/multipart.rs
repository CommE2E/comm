use actix_multipart::{Field, MultipartError};
use actix_web::error::{ErrorBadRequest, ParseError};
use tokio_stream::StreamExt;
use tracing::warn;

/// Can be used to get a single field from multipart body with it's data
/// converted to a string
///
/// # Example
/// ```no_run
/// # use comm_services_lib::http::multipart;
/// # use actix_multipart::Multipart;
/// # async fn f(mut payload: Multipart) {
/// let Some((name, mut stream)) = multipart::get_text_field(&mut payload).await.unwrap() else {
///   // Missing field
///   return;
/// };
/// if name != "Field name" {
///   // Wrong field name
///   return;
/// };
/// println!("Got string: {name}");
/// # }
/// ```
pub async fn get_text_field(
  multipart: &mut actix_multipart::Multipart,
) -> anyhow::Result<Option<(String, String)>, MultipartError> {
  let Some(mut field): Option<Field> = multipart.try_next().await? else {
    return Ok(None);
  };

  let name = field.name().to_string();

  let mut buf = Vec::new();
  while let Some(chunk) = field.try_next().await? {
    buf.extend_from_slice(&chunk);
  }

  let text =
    String::from_utf8(buf).map_err(|err| ParseError::Utf8(err.utf8_error()))?;

  Ok(Some((name, text)))
}

pub async fn get_named_text_field(
  name: &str,
  multipart: &mut actix_multipart::Multipart,
) -> actix_web::Result<String> {
  let Some((field_name, backup_id)) = get_text_field(multipart).await? else {
    warn!("Malformed request: expected a field.");
    return Err(ErrorBadRequest("Bad request"));
  };

  if field_name != name {
    warn!(name, "Malformed request: '{name}' text field expected.");
    return Err(ErrorBadRequest("Bad request"));
  }

  Ok(backup_id)
}
