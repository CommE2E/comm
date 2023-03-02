#pragma once

#include "MessageSpecs/ChangeRoleMessageSpec.h"
#include "MessageSpecs/ChangeSettingsMessageSpec.h"
#include "MessageSpecs/CreateEntryMessageSpec.h"
#include "MessageSpecs/CreateSidebarMessageSpec.h"
#include "MessageSpecs/CreateSubThreadMessageSpec.h"
#include "MessageSpecs/CreateThreadMessageSpec.h"
#include "MessageSpecs/DeleteEntryMessageSpec.h"
#include "MessageSpecs/EditEntryMessageSpec.h"
#include "MessageSpecs/EditMessageSpec.h"
#include "MessageSpecs/MessageSpec.h"
#include "MessageSpecs/MultimediaMessageSpec.h"
#include "MessageSpecs/ReactionMessageSpec.h"
#include "MessageSpecs/RestoreEntryMessageSpec.h"
#include "MessageSpecs/SidebarSourceMessageSpec.h"
#include "MessageSpecs/TextMessageSpec.h"
#include "MessageSpecs/UnsupportedMessageSpec.h"
#include "MessageSpecs/UpdateRelationshipMessageSpec.h"

#include <map>

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
  UPDATE_RELATIONSHIP,
  SIDEBAR_SOURCE,
  CREATE_SIDEBAR,
  REACTION,
  EDIT_MESSAGE,
};

const std::map<MessageType, std::unique_ptr<MessageSpec>> messageSpecsHolder =
    []() {
      std::map<MessageType, std::unique_ptr<MessageSpec>>
          message_specs_initializer;
      message_specs_initializer.insert(
          {MessageType::TEXT, std::make_unique<TextMessageSpec>()});
      message_specs_initializer.insert(
          {MessageType::CREATE_THREAD,
           std::make_unique<CreateThreadMessageSpec>()});
      message_specs_initializer.insert(
          {MessageType::CREATE_SUB_THREAD,
           std::make_unique<CreateSubThreadMessageSpec>()});
      message_specs_initializer.insert(
          {MessageType::CHANGE_SETTINGS,
           std::make_unique<ChangeSettingsMessageSpec>()});
      message_specs_initializer.insert(
          {MessageType::CHANGE_ROLE,
           std::make_unique<ChangeRoleMessageSpec>()});
      message_specs_initializer.insert(
          {MessageType::CREATE_ENTRY,
           std::make_unique<CreateEntryMessageSpec>()});
      message_specs_initializer.insert(
          {MessageType::EDIT_ENTRY, std::make_unique<EditEntryMessageSpec>()});
      message_specs_initializer.insert(
          {MessageType::DELETE_ENTRY,
           std::make_unique<DeleteEntryMessageSpec>()});
      message_specs_initializer.insert(
          {MessageType::RESTORE_ENTRY,
           std::make_unique<RestoreEntryMessageSpec>()});
      message_specs_initializer.insert(
          {MessageType::UNSUPPORTED,
           std::make_unique<UnsupportedMessageSpec>()});
      message_specs_initializer.insert(
          {MessageType::IMAGES, std::make_unique<MultimediaMessageSpec>()});
      message_specs_initializer.insert(
          {MessageType::MULTIMEDIA, std::make_unique<MultimediaMessageSpec>()});
      message_specs_initializer.insert(
          {MessageType::UPDATE_RELATIONSHIP,
           std::make_unique<UpdateRelationshipMessageSpec>()});
      message_specs_initializer.insert(
          {MessageType::CREATE_SIDEBAR,
           std::make_unique<CreateSidebarMessageSpec>()});
      message_specs_initializer.insert(
          {MessageType::REACTION, std::make_unique<ReactionMessageSpec>()});
      message_specs_initializer.insert(
          {MessageType::SIDEBAR_SOURCE,
           std::make_unique<SidebarSourceMessageSpec>()});
      message_specs_initializer.insert(
          {MessageType::EDIT_MESSAGE, std::make_unique<EditMessageSpec>()});
      return message_specs_initializer;
    }();

} // namespace comm
