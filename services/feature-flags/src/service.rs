use crate::database::{DatabaseClient, Error, FeatureConfig, Platform};
use std::collections::HashSet;

pub struct FeatureFlagsService {
  _db: DatabaseClient,
}

impl FeatureFlagsService {
  pub fn new(db_client: DatabaseClient) -> Self {
    FeatureFlagsService { _db: db_client }
  }

  pub async fn _enabled_features_set(
    db: &DatabaseClient,
    platform: Platform,
    code_version: i32,
    is_staff: bool,
  ) -> Result<HashSet<String>, Error> {
    let features_config = db.get_features_configuration(platform).await?;
    Ok(
      features_config
        .into_values()
        .filter_map(|config| {
          Self::_check_if_feature_is_enabled(code_version, is_staff, config)
        })
        .collect(),
    )
  }

  fn _check_if_feature_is_enabled(
    code_version: i32,
    is_staff: bool,
    feature_config: FeatureConfig,
  ) -> Option<String> {
    feature_config
      .config
      .keys()
      .filter(|version| version.clone() <= &code_version)
      .max()
      .and_then(|version| feature_config.config.get(version))
      .map(|config| {
        if is_staff {
          config.staff
        } else {
          config.non_staff
        }
      })
      .and_then(|is_enabled| {
        if is_enabled {
          Some(feature_config.name)
        } else {
          None
        }
      })
  }
}
