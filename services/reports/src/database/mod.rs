pub mod item;

mod constants {
  pub const TABLE_NAME: &str = "reports-service-reports";

  pub const ATTR_REPORT_ID: &str = "reportID";
  pub const ATTR_USER_ID: &str = "userID";
  pub const ATTR_REPORT_TYPE: &str = "type";
  pub const ATTR_PLATFORM: &str = "platform";
  pub const ATTR_BLOB_INFO: &str = "blobInfo";
  pub const ATTR_REPORT_CONTENT: &str = "content";
  pub const ATTR_ENCRYPTION_KEY: &str = "encryptionKey";
  pub const ATTR_CREATION_TIME: &str = "creationTime";
}
