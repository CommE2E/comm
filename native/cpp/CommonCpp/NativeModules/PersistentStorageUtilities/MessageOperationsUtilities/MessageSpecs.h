#pragma once

#include "MessageSpecs/AddMembersMessageSpec.h"
#include "MessageSpecs/ChangeRoleMessageSpec.h"
#include "MessageSpecs/ChangeSettingsMessageSpec.h"
#include "MessageSpecs/CreateEntryMessageSpec.h"
#include "MessageSpecs/CreateSidebarMessageSpec.h"
#include "MessageSpecs/CreateSubThreadMessageSpec.h"
#include "MessageSpecs/CreateThreadMessageSpec.h"
#include "MessageSpecs/DeleteEntryMessageSpec.h"
#include "MessageSpecs/DeleteMessageSpec.h"
#include "MessageSpecs/EditEntryMessageSpec.h"
#include "MessageSpecs/EditMessageSpec.h"
#include "MessageSpecs/JoinThreadMessageSpec.h"
#include "MessageSpecs/LeaveThreadMessageSpec.h"
#include "MessageSpecs/MessageSpec.h"
#include "MessageSpecs/MultimediaMessageSpec.h"
#include "MessageSpecs/ReactionMessageSpec.h"
#include "MessageSpecs/RemoveMembersMessageSpec.h"
#include "MessageSpecs/RestoreEntryMessageSpec.h"
#include "MessageSpecs/SidebarSourceMessageSpec.h"
#include "MessageSpecs/TextMessageSpec.h"
#include "MessageSpecs/UnsupportedMessageSpec.h"
#include "MessageSpecs/UpdateRelationshipMessageSpec.h"
#include "MessageTypeEnum.h"

#include <map>

namespace comm {

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
          {MessageType::LEGACY_UPDATE_RELATIONSHIP,
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
      message_specs_initializer.insert(
          {MessageType::UPDATE_RELATIONSHIP,
           std::make_unique<UpdateRelationshipMessageSpec>()});
      message_specs_initializer.insert(
          {MessageType::UPDATE_RELATIONSHIP,
           std::make_unique<UpdateRelationshipMessageSpec>()});
      message_specs_initializer.insert(
          {MessageType::JOIN_THREAD,
           std::make_unique<JoinThreadMessageSpec>()});
      message_specs_initializer.insert(
          {MessageType::LEAVE_THREAD,
           std::make_unique<LeaveThreadMessageSpec>()});
      message_specs_initializer.insert(
          {MessageType::ADD_MEMBERS,
           std::make_unique<AddMembersMessageSpec>()});
      message_specs_initializer.insert(
          {MessageType::REMOVE_MEMBERS,
           std::make_unique<RemoveMembersMessageSpec>()});
      message_specs_initializer.insert(
          {MessageType::DELETE_MESSAGE, std::make_unique<DeleteMessageSpec>()});
      return message_specs_initializer;
    }();

} // namespace comm
