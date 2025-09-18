use tunnelbroker_messages::farcaster::{
  DirectCastConversation, DirectCastMessageType,
  RefreshDirectCastConversationPayload,
};

use crate::notifs::GenericNotifPayload;

pub fn prepare_notif_payload(
  payload: &RefreshDirectCastConversationPayload,
  conversation: &DirectCastConversation,
  recipient_fid: Option<&String>,
) -> Option<GenericNotifPayload> {
  let RefreshDirectCastConversationPayload {
    conversation_id,
    message,
    ..
  } = payload;

  if conversation.muted {
    // TODO: badge only?
    return None;
  }
  if message.message_type != DirectCastMessageType::Text {
    return None;
  }

  // Don't send a notif from self
  if recipient_fid.is_some_and(|fid| *fid == message.sender_fid.to_string()) {
    return None;
  }

  let message_metadata = message.extra.get("metadata");
  let has_photos =
    message_metadata.is_some_and(|metadata| metadata["medias"].is_array());
  let has_videos =
    message_metadata.is_some_and(|metadata| metadata["videos"].is_array());

  let title = conversation
    .name
    .as_deref()
    .or_else(|| {
      conversation
        .participant(message.sender_fid)
        .map(|u| u.display_name.as_str())
    })
    .unwrap_or("Farcaster");

  let body = if has_photos {
    "[Photo message]"
  } else if has_videos {
    "[Video message]"
  } else {
    message.message.as_str()
  };

  Some(GenericNotifPayload {
    title: trim_text(title, 100),
    body: trim_text(body, 300),
    thread_id: format!("FARCASTER#{}", conversation_id),
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
