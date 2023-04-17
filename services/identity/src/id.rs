use uuid::Uuid;

pub fn generate_uuid() -> String {
  let mut buf = [b'\0'; 36];
  Uuid::new_v4().hyphenated().encode_upper(&mut buf);
  std::str::from_utf8(&buf)
    .expect("Unable to create UUID")
    .to_string()
}

#[cfg(test)]
mod tests {
  use super::*;
  #[test]
  fn test_generate_uuid() {
    generate_uuid();
  }
}
