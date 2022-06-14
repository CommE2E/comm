#[path = "./lib/tools.rs"]
mod tools;

use tools::Error;

#[tokio::test]
async fn backup_test() -> Result<(), Error> {
  assert!(false, "not implemented");
  Ok(())
}
