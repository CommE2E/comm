use std::borrow::Cow;

use tunnelbroker_messages::farcaster::{
  DirectCastConversation, DirectCastMessageType,
  RefreshDirectCastConversationPayload,
};

use crate::notifs::GenericNotifPayload;

pub fn prepare_notif_payload(
  payload: &RefreshDirectCastConversationPayload,
  conversation: &DirectCastConversation,
  recipient_fid: &str,
) -> Option<GenericNotifPayload> {
  let RefreshDirectCastConversationPayload {
    conversation_id,
    message,
    ..
  } = payload;

  if conversation.muted {
    return None;
  }
  if conversation.viewer_context.category == "request" {
    return None;
  }
  if message.message_type != DirectCastMessageType::Text {
    return None;
  }

  // Don't send a notif from self
  if recipient_fid == message.sender_fid.to_string() {
    return None;
  }

  let message_metadata = message.extra.get("metadata");
  let has_photos =
    message_metadata.is_some_and(|metadata| metadata["medias"].is_array());
  let has_videos =
    message_metadata.is_some_and(|metadata| metadata["videos"].is_array());

  let sender_name = conversation
    .participant(message.sender_fid)
    .map(|u| u.display_name.as_str());
  let title = conversation
    .name
    .as_deref()
    .or(sender_name)
    .unwrap_or("Farcaster DC");

  let body: Cow<str> = if has_photos {
    sender_name
      .map(|author| format!("{author} sent a photo").into())
      .unwrap_or("[Photo message]".into())
  } else if has_videos {
    sender_name
      .map(|author| format!("{author} sent a video").into())
      .unwrap_or("[Video message]".into())
  } else {
    Cow::Borrowed(message.message.as_str())
  };

  Some(GenericNotifPayload {
    title: Some(trim_text(title, 100)),
    body: Some(trim_text(&body, 300)),
    thread_id: Some(format!("FARCASTER#{}", conversation_id)),
    badge: None,
    badge_only: None,
    farcaster_badge: None,
  })
}

fn trim_text(text: &str, max_length: usize) -> String {
  if text.len() <= max_length {
    return text.to_string();
  } else if max_length <= 3 {
    return text[0..max_length].to_string();
  }
  let substr = text[0..(max_length - 3)].to_string();
  format!("{}...", substr)
}
