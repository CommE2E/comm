use maud::{html, Markup, Render};

use crate::report_types::*;

mod html_layout;

pub fn render_email_for_report(
  report_input: &ReportInput,
  report_id: &ReportID,
  user_id: Option<&str>,
) -> String {
  html_layout::render_page(message_body_for_report(
    report_input,
    report_id,
    user_id,
  ))
}

fn message_body_for_report(
  report: &ReportInput,
  report_id: &ReportID,
  user_id: Option<&str>,
) -> Markup {
  let user = user_id.unwrap_or("N/A");
  let platform = &report.platform_details;
  let time = report
    .time
    .unwrap_or_default()
    .format("%d/%m/%y %H:%M:%S")
    .to_string();

  html! {
    ul {
      li { "User ID:  " b { (user) } }
      li { "Platform: " (platform)   }
      li { "Time:     " b { (time) } }
    }
  }
}

impl Render for PlatformDetails {
  fn render(&self) -> Markup {
    let code_version = self
      .code_version
      .map(|it| it.to_string())
      .unwrap_or("N/A".into());
    html! {
      b { (self.platform) } ", code version: " b { (code_version) }
    }
  }
}
