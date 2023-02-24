use crate::config::CONFIG;
use crate::constants::{PLATFORM_ANDROID, PLATFORM_IOS};
use crate::database::{DatabaseClient, FeatureConfig, Platform};
use actix_web::http::header::ContentType;
use actix_web::{web, App, HttpResponse, HttpServer};
use comm_services_lib::database::Error;
use serde::Deserialize;
use std::collections::HashSet;

pub struct FeatureFlagsService {
  db: DatabaseClient,
}

impl FeatureFlagsService {
  pub fn new(db_client: DatabaseClient) -> Self {
    FeatureFlagsService { db: db_client }
  }

  pub async fn start(&self) -> std::io::Result<()> {
    let db_clone = self.db.clone();
    HttpServer::new(move || {
      App::new()
        .app_data(web::Data::new(db_clone.to_owned()))
        .service(
          web::resource("/features")
            .route(web::get().to(Self::features_handler)),
        )
    })
    .bind(("0.0.0.0", CONFIG.http_port))?
    .run()
    .await
  }

  async fn features_handler(
    client: web::Data<DatabaseClient>,
    query: web::Query<FeatureQuery>,
  ) -> HttpResponse {
    let platform = match query.platform.as_str().to_uppercase().as_str() {
      PLATFORM_IOS => Platform::IOS,
      PLATFORM_ANDROID => Platform::ANDROID,
      _ => return HttpResponse::BadRequest().finish(),
    };
    match Self::enabled_features_set(
      client.get_ref(),
      platform,
      query.code_version,
      query.is_staff,
    )
    .await
    {
      Ok(features) => {
        let response_body = features.into_iter().collect::<Vec<_>>().join(",");
        HttpResponse::Ok()
          .content_type(ContentType::plaintext())
          .body(response_body)
      }
      _ => HttpResponse::InternalServerError().finish(),
    }
  }

  async fn enabled_features_set(
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
          Self::feature_name_if_enabled(code_version, is_staff, config)
        })
        .collect(),
    )
  }

  fn feature_name_if_enabled(
    code_version: i32,
    is_staff: bool,
    feature_config: FeatureConfig,
  ) -> Option<String> {
    feature_config
      .config
      .keys()
      .filter(|version| *version <= &code_version)
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

#[derive(Deserialize, Debug)]
struct FeatureQuery {
  code_version: i32,
  is_staff: bool,
  platform: String,
}
