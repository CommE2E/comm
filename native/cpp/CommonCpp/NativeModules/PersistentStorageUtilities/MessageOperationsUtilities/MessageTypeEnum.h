#pragma once

namespace comm {

// Should be in sync with lib/types/message-types-enum.js
enum class MessageType {
  TEXT = 0,
  CREATE_THREAD = 1,
  ADD_MEMBERS = 2,
  CREATE_SUB_THREAD = 3,
  CHANGE_SETTINGS = 4,
  REMOVE_MEMBERS = 5,
  CHANGE_ROLE = 6,
  LEAVE_THREAD = 7,
  JOIN_THREAD = 8,
  CREATE_ENTRY = 9,
  EDIT_ENTRY = 10,
  DELETE_ENTRY = 11,
  RESTORE_ENTRY = 12,
  UNSUPPORTED = 13,
  IMAGES = 14,
  MULTIMEDIA = 15,
  LEGACY_UPDATE_RELATIONSHIP = 16,
  SIDEBAR_SOURCE = 17,
  CREATE_SIDEBAR = 18,
  REACTION = 19,
  EDIT_MESSAGE = 20,
  TOGGLE_PIN = 21,
  UPDATE_RELATIONSHIP = 22,
  DELETE_MESSAGE = 23,
};

} // namespace comm
