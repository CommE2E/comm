use anyhow::{Context, Result};
use std::{collections::HashMap, path::PathBuf, str::FromStr};

use crate::report_types::ReportType;

const ENV_EMAIL_CONFIG: &str = "EMAIL_CONFIG";
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
  /// Ability to disable e-mails while keeping the rest of the config
  #[serde(default)]
  disabled: bool,
  /// API key for Postmark
  pub postmark_token: String,
  /// E-mail that is used as a sender
  pub sender_email: String,
  /// Receiver e-mails for report types
  pub mailing_groups: HashMap<MailingGroup, String>,
}

impl FromStr for EmailConfig {
  type Err = serde_json::Error;
  fn from_str(s: &str) -> Result<Self, Self::Err> {
    serde_json::from_str(s)
  }
}

/// Email-related CLI arguments for clap
#[derive(clap::Args)]
#[group(multiple = false)]
pub struct EmailArgs {
  // these args are mutually exclusive
  #[arg(env = ENV_EMAIL_CONFIG)]
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
    let config_content = self.config_content.as_ref();
    if config_content.is_some() {
      // we deliberately check 'disabled' here so if somebody disables,
      // it doesn't fall back to file
      let config = config_content.filter(|cfg| !cfg.disabled).cloned();
      return Ok(config);
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

    if cfg.disabled {
      return Ok(None);
    }
    Ok(Some(cfg))
  }
}

#[cfg(test)]
mod tests {
  use once_cell::sync::Lazy;

  use super::*;

  static EXAMPLE_CFG: Lazy<EmailConfig> = Lazy::new(|| EmailConfig {
    disabled: false,
    postmark_token: "supersecret".to_string(),
    sender_email: "foo@bar.com".to_string(),
    mailing_groups: HashMap::new(),
  });

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
