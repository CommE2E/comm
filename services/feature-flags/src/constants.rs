pub const AWS_REGION: &str = "us-east-2";
pub const DEFAULT_LOCALSTACK_URL: &str = "http://localhost:4566";
pub const LOG_LEVEL_ENV_VAR: &str =
  tracing_subscriber::filter::EnvFilter::DEFAULT_ENV;

// The configuration of feature flags is stored in a table in DynamoDB.
// Each row is identified by a compound primary key consisting of
// partition key - platform and sort key - feature.
// A row also contains the configuration, which is a map indexed  by code
// version with values containing boolean flags for staff and non-staff config.
// A sample row from the db looks like this:
// {
//   "feature": S("FEATURE_1"),
//   "configuration": M({
//     "123": M({
//       "staff": Bool(true),
//       "non-staff": Bool(false)
//     })
//   }),
//   "platform": S("ANDROID")
//  }
pub const FEATURE_FLAGS_TABLE_NAME: &str = "feature-flags";
pub const FEATURE_FLAGS_PLATFORM_FIELD: &str = "platform";
pub const FEATURE_FLAGS_CONFIG_FIELD: &str = "configuration";
pub const FEATURE_FLAGS_FEATURE_FIELD: &str = "feature";
pub const FEATURE_FLAGS_STAFF_FIELD: &str = "staff";
pub const FEATURE_FLAGS_NON_STAFF_FIELD: &str = "non-staff";
