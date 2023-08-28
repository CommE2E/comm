use maud::{html, Markup, Render};
use tracing::error;

use crate::{config::SERVICE_PUBLIC_URL, report_types::*};

mod html_layout;

const MAX_JSON_LINES: usize = 100;

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

// Examples:
// [Android] Error report for User(ID = foo)
// Media mission failed for User(ID = foo)
// Thread inconsistency report for User(ID = foo)
pub fn subject_for_report(
  report_input: &ReportInput,
  user_id: Option<&str>,
) -> String {
  let kind = title_for_report_type(&report_input.report_type);
  let user = format!("User(ID = {})", user_id.unwrap_or("[unknown]"));
  let object = if report_input.report_type.is_media_mission() {
    media_mission_status(report_input)
  } else {
    "report"
  };
  let platform_prefix = if report_input.report_type.is_error() {
    format!("[{}] ", report_input.platform_details.platform)
  } else {
    "".into()
  };

  format!("{platform_prefix}{kind} {object} for {user}")
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
    h2 { (title_for_report_type(&report.report_type)) " report" }
    p { (intro_text(report, user_id)) }
    ul {
      li { "User ID:  " b { (user) } }
      li { "Platform: " (platform)   }
      li { "Time:     " b { (time) } }
    }
    (further_actions(report_id, report.report_type.is_error()))
    (display_contents(report, report_id))
  }
}

fn title_for_report_type(report_type: &ReportType) -> &str {
  match report_type {
    ReportType::ErrorReport => "Error",
    ReportType::ThreadInconsistency => "Thread inconsistency",
    ReportType::EntryInconsistency => "Entry inconsistency",
    ReportType::UserInconsistency => "User inconsistency",
    ReportType::MediaMission => "Media mission",
  }
}

fn intro_text(report: &ReportInput, user_id: Option<&str>) -> String {
  let user = format!("User (ID = {})", user_id.unwrap_or("[unknown]"));
  match &report.report_type {
    ReportType::ErrorReport => format!("{user} encountered an error :("),
    ReportType::ThreadInconsistency
    | ReportType::EntryInconsistency
    | ReportType::UserInconsistency => {
      format!("System detected inconsistency for {user}")
    }
    ReportType::MediaMission => {
      let status = media_mission_status(report);
      format!("Media mission {status} for {user}")
    }
  }
}

/// returns "success" or "failed" based on media mission status
/// falls back to "completed" if couldn't determine
fn media_mission_status(report: &ReportInput) -> &str {
  report
    .report_content
    .get("mediaMission")
    .and_then(|obj| obj["result"]["success"].as_bool())
    .map(|success| if success { "success" } else { "failed" })
    .unwrap_or("completed")
}

fn further_actions(
  report_id: &ReportID,
  display_download_link: bool,
) -> Markup {
  html! {
    h3 { "Further actions" }
    ul {
      li { a href=(report_link(report_id)) { "Open raw report JSON" } }
      @if display_download_link {
        li { a href={ (report_link(report_id)) "/redux-devtools.json" } { "Redux Devtools import" } }
      }
    }
  }
}

fn display_contents(report: &ReportInput, report_id: &ReportID) -> Markup {
  let pretty = match serde_json::to_string_pretty(&report.report_content) {
    Ok(string) => string,
    Err(err) => {
      error!("Failed to render report JSON: {err}");
      return html! { pre { "ERROR: Failed to render JSON" } };
    }
  };

  let content: String = pretty
    .split('\n')
    .take(MAX_JSON_LINES)
    .collect::<Vec<&str>>()
    .join("\n");

  html! {
    h3 { "Report contents" }
    em {
      "The content is truncated to " (MAX_JSON_LINES) " lines. To view more, "
      a href=(report_link(report_id)) { "open full report" }
      "."
    }
    pre { (content) }
  }
}

fn report_link(id: &ReportID) -> String {
  let base_url = SERVICE_PUBLIC_URL.as_str();
  format!("{base_url}/reports/{}", id.as_str())
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
