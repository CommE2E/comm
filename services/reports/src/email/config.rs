use anyhow::{Context, Result};
use std::{collections::HashMap, path::PathBuf, str::FromStr};
use tracing::warn;

use crate::report_types::ReportType;

const ENV_POSTMARK_TOKEN: &str = "POSTMARK_TOKEN";
const DEFAULT_CONFIG_PATH: &str = "./email-config.json";

#[derive(Clone, Debug, Hash, Eq, PartialEq, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum MailingGroup {
  ErrorsReports,
  InconsistencyReports,
  MediaReports,
}

impl From<&ReportType> for MailingGroup {
  fn from(value: &ReportType) -> Self {
    use ReportType::*;
    match value {
      ErrorReport => Self::ErrorsReports,
      MediaMission => Self::MediaReports,
      ThreadInconsistency | EntryInconsistency | UserInconsistency => {
        Self::InconsistencyReports
      }
    }
  }
}

#[derive(Clone, Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EmailConfig {
  postmark_token: Option<String>,
  /// E-mail that is used as a sender
  pub sender_email: String,
  /// Receiver e-mails for report types
  pub mailing_groups: HashMap<MailingGroup, String>,
}

impl EmailConfig {
  /// API key for Postmark
  pub fn postmark_token(&self) -> &str {
    // Postmark token is always defined for valid config
    self
      .postmark_token
      .as_ref()
      .expect("FATAL. Postmark token not defined")
  }
}

impl FromStr for EmailConfig {
  type Err = serde_json::Error;
  fn from_str(s: &str) -> Result<Self, Self::Err> {
    let mut cfg: EmailConfig = serde_json::from_str(s)?;
    // Token from env has higher priority
    cfg.postmark_token = postmark_token_from_env().or(cfg.postmark_token);

    if cfg.postmark_token.is_none() {
      warn!("Email config provided but Postmark token not found. Emails will not be sent!");
    }
    Ok(cfg)
  }
}

/// Email-related CLI arguments for clap
#[derive(clap::Args)]
#[group(multiple = false)]
pub struct EmailArgs {
  // these args are mutually exclusive
  #[arg(long = "email-config")]
  config_content: Option<EmailConfig>,

  #[arg(
    long = "email-config-file",
    default_value = DEFAULT_CONFIG_PATH,
    value_hint = clap::ValueHint::FilePath
  )]
  config_file: Option<PathBuf>,
}

impl EmailArgs {
  pub fn parse(&self) -> Result<Option<EmailConfig>> {
    if self
      .config_content
      .as_ref()
      .is_some_and(|it| it.postmark_token.is_some())
    {
      return Ok(self.config_content.clone());
    }

    let Some(path) = self.config_file.as_ref() else {
      return Ok(None);
    };

    let file_contents = match std::fs::read_to_string(path) {
      Ok(contents) => contents,
      Err(_) if path.to_str() == Some(DEFAULT_CONFIG_PATH) => {
        // Failed to read but it's default path so we can skip
        return Ok(None);
      }
      err => err.with_context(|| format!("Failed to read path: {path:?}"))?,
    };

    let cfg = EmailConfig::from_str(&file_contents)
      .context("Failed to parse email config file")?;

    // Don't provide emails config if token not present
    if cfg.postmark_token.is_none() {
      return Ok(None);
    }
    Ok(Some(cfg))
  }
}

fn postmark_token_from_env() -> Option<String> {
  std::env::var(ENV_POSTMARK_TOKEN)
    .ok()
    .filter(|s| !s.is_empty())
}

#[cfg(test)]
mod tests {
  use once_cell::sync::Lazy;

  use super::*;

  const RAW_CFG: &str = r#"{
      "postmarkToken": "hello",
      "senderEmail": "a@b.c",
      "mailingGroups": {}
    }"#;
  const RAW_CFG_NO_TOKEN: &str =
    r#"{"senderEmail": "a@b.c", "mailingGroups": {} }"#;

  static EXAMPLE_CFG: Lazy<EmailConfig> = Lazy::new(|| EmailConfig {
    postmark_token: Some("hello".to_string()),
    sender_email: "foo@bar.com".to_string(),
    mailing_groups: HashMap::new(),
  });

  static EXAMPLE_CFG_NO_TOKEN: Lazy<EmailConfig> = Lazy::new(|| EmailConfig {
    postmark_token: None,
    sender_email: "foo@bar.com".to_string(),
    mailing_groups: HashMap::new(),
  });

  #[test]
  fn test_postmark_token() {
    // make sure existing env var doesn't interrupt the test
    if postmark_token_from_env().is_some() {
      std::env::set_var(ENV_POSTMARK_TOKEN, "");
    }

    let cfg: EmailConfig =
      RAW_CFG_NO_TOKEN.parse().expect("failed to parse config");
    assert!(cfg.postmark_token.is_none());

    let cfg: EmailConfig = RAW_CFG.parse().expect("failed to parse config");
    assert!(cfg
      .postmark_token
      .as_ref()
      .is_some_and(|token| token == "hello"));

    // env should override
    std::env::set_var(ENV_POSTMARK_TOKEN, "world");
    let cfg: EmailConfig = RAW_CFG.parse().expect("failed to parse config");
    assert!(cfg
      .postmark_token
      .as_ref()
      .is_some_and(|token| token == "world"));
  }

  #[test]
  fn parse_args_no_token() {
    // should return none when config exists but has no token
    let mut args = EmailArgs {
      config_content: Some(EXAMPLE_CFG_NO_TOKEN.clone()),
      config_file: None,
    };
    let cfg = args.parse().expect("failed to parse");
    assert!(cfg.is_none());

    args.config_content = Some(EXAMPLE_CFG.clone());
    let cfg = args.parse().expect("failed to parse");
    assert!(cfg.is_some());
  }

  #[test]
  fn parse_args_priority() {
    // direct content should have higher priority than file
    let args = EmailArgs {
      config_content: Some(EXAMPLE_CFG.clone()),
      config_file: Some("/hello.json".into()),
    };
    let cfg = args.parse().expect("failed to parse");
    assert!(cfg.is_some());
    assert_eq!(cfg.unwrap().sender_email, EXAMPLE_CFG.sender_email);
  }

  #[test]
  fn parse_skips_default_path() {
    let args = EmailArgs {
      config_content: None,
      config_file: Some("not/exists.json".into()),
    };
    args.parse().expect_err("parse should fail");

    let args = EmailArgs {
      config_content: None,
      config_file: Some(DEFAULT_CONFIG_PATH.into()),
    };
    // if this fails, check if your email-config.json is correct
    let _ = args.parse().expect("failed to parse");

    // we cannot assert if parsed config is none because the actual file
    // can exist on developer's machine
  }
}
