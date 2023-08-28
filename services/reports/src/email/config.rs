use tracing::warn;

use crate::report_types::ReportType;

const ENV_POSTMARK_TOKEN: &str = "POSTMARK_TOKEN";

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

fn postmark_token_from_env() -> Option<String> {
  std::env::var(ENV_POSTMARK_TOKEN)
    .ok()
    .filter(|s| !s.is_empty())
}

#[cfg(test)]
mod tests {
  use super::*;

  const RAW_CFG: &str = r#"{
      "postmarkToken": "hello",
      "senderEmail": "a@b.c",
      "mailingGroups": {}
    }"#;
  const RAW_CFG_NO_TOKEN: &str =
    r#"{"senderEmail": "a@b.c", "mailingGroups": {} }"#;

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
}
