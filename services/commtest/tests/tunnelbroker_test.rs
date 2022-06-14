#[path = "./lib/tools.rs"]
mod tools;

use tools::Error;

#[tokio::test]
async fn tunnelbroker_test() -> Result<(), Error> {
  assert!(false, "not implemented");
  Ok(())
}
