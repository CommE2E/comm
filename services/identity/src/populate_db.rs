use mysql_async::prelude::{Query, WithParams};
use tracing::info;

#[derive(Debug)]
struct User {
  id: i64,
  username: String,
  creation_time: i64,
}

pub async fn get_users(
  user: &str,
  password: &str,
  domain: &str,
  port: &str,
  database: &str,
) -> Result<Vec<User>, mysql_async::Error> {
  let database_url = format!(
    "mysql://{}:{}@{}:{}/{}",
    user, password, domain, port, database
  );
  let pool = mysql_async::Pool::new(database_url.as_str());
  let mut conn = pool.get_conn().await?;
  "SELECT id, username, creation_time FROM users"
    .with(())
    .map(&mut conn, |(id, username, creation_time)| User {
      id,
      username,
      creation_time,
    })
    .await
}
