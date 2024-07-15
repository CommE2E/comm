#pragma once

namespace comm {

enum class MessageType {
  TEXT,
  CREATE_THREAD,
  ADD_MEMBERS,
  CREATE_SUB_THREAD,
  CHANGE_SETTINGS,
  REMOVE_MEMBERS,
  CHANGE_ROLE,
  LEAVE_THREAD,
  JOIN_THREAD,
  CREATE_ENTRY,
  EDIT_ENTRY,
  DELETE_ENTRY,
  RESTORE_ENTRY,
  UNSUPPORTED,
  IMAGES,
  MULTIMEDIA,
  LEGACY_UPDATE_RELATIONSHIP,
  SIDEBAR_SOURCE,
  CREATE_SIDEBAR,
  REACTION,
  EDIT_MESSAGE,
  TOGGLE_PIN,
  UPDATE_RELATIONSHIP,
};

} // namespace comm
