use actix_multipart::{Field, MultipartError};
use actix_web::error::ParseError;
use tokio_stream::StreamExt;

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
