use postmark::{
  api::email::{self, SendEmailBatchRequest},
  reqwest::{PostmarkClient, PostmarkClientError},
  Query,
};
use tracing::{debug, trace, warn};

use crate::{
  config::CONFIG,
  report_types::{ReportID, ReportInput, ReportType},
};

pub mod config;
mod template;

pub type EmailError = postmark::QueryError<PostmarkClientError>;

pub struct ReportEmail {
  report_type: ReportType,
  rendered_message: String,
  subject: String,
}

pub fn prepare_email(
  report_input: &ReportInput,
  report_id: &ReportID,
  user_id: Option<&str>,
) -> ReportEmail {
  let message =
    template::render_email_for_report(report_input, report_id, user_id);
  let subject = template::subject_for_report(report_input, user_id);
  ReportEmail {
    report_type: report_input.report_type,
    rendered_message: message,
    subject,
  }
}

pub async fn send_emails(
  emails: impl IntoIterator<Item = ReportEmail>,
) -> Result<(), EmailError> {
  let Some(email_config) = CONFIG.email_config() else {
    debug!("E-mail config unavailable. Skipping sending e-mails");
    return Ok(());
  };

  // it's cheap to build this every time
  let client = PostmarkClient::builder()
    .server_token(&email_config.postmark_token)
    .build();

  let requests: SendEmailBatchRequest = emails
    .into_iter()
    .filter_map(|item| {
      let Some(recipient) =
        email_config.recipient_for_report_type(&item.report_type)
      else {
        warn!(
          "Recipient E-mail for {:?} not configured. Skipping",
          &item.report_type
        );
        return None;
      };

      let email = email::SendEmailRequest::builder()
        .from(&email_config.sender_email)
        .to(recipient)
        .body(postmark::api::Body::html(item.rendered_message))
        .subject(item.subject)
        .build();
      Some(email)
    })
    .collect();

  let responses = requests.execute(&client).await?;
  trace!(?responses, "E-mails sent successfully.");
  Ok(())
}
