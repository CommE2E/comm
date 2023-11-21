#pragma once

#include <memory>
#include <string>

#include "Nullable.h"

namespace comm {

struct Thread {
  std::string id;
  int type;
  std::unique_ptr<std::string> name;
  std::unique_ptr<std::string> description;
  std::string color;
  int64_t creation_time;
  std::unique_ptr<std::string> parent_thread_id;
  std::unique_ptr<std::string> containing_thread_id;
  std::unique_ptr<std::string> community;
  std::string members;
  std::string roles;
  std::string current_user;
  std::unique_ptr<std::string> source_message_id;
  int replies_count;
  std::unique_ptr<std::string> avatar;
  int pinned_count;
};

struct WebThread {
  std::string id;
  int type;
  NullableString name;
  NullableString description;
  std::string color;
  std::string creation_time;
  NullableString parent_thread_id;
  NullableString containing_thread_id;
  NullableString community;
  std::string members;
  std::string roles;
  std::string current_user;
  NullableString source_message_id;
  int replies_count;
  NullableString avatar;
  int pinned_count;

  void fromThread(const Thread &thread) {
    id = thread.id;
    type = thread.type;
    name = NullableString(thread.name);
    description = NullableString(thread.description);
    color = thread.color;
    creation_time = std::to_string(thread.creation_time);
    parent_thread_id = NullableString(thread.parent_thread_id);
    containing_thread_id = NullableString(thread.containing_thread_id);
    community = NullableString(thread.community);
    members = thread.members;
    roles = thread.roles;
    current_user = thread.current_user;
    source_message_id = NullableString(thread.source_message_id);
    replies_count = thread.replies_count;
    avatar = NullableString(thread.avatar);
    pinned_count = thread.pinned_count;
  }

  Thread toThread() const {
    Thread thread;
    thread.id = id;
    thread.type = type;
    thread.name = name.resetValue();
    thread.description = description.resetValue();
    thread.color = color;
    thread.creation_time = std::stoll(creation_time);
    thread.parent_thread_id = parent_thread_id.resetValue();
    thread.containing_thread_id = containing_thread_id.resetValue();
    thread.community = community.resetValue();
    thread.members = members;
    thread.roles = roles;
    thread.current_user = current_user;
    thread.source_message_id = source_message_id.resetValue();
    thread.replies_count = replies_count;
    thread.avatar = avatar.resetValue();
    thread.pinned_count = pinned_count;
    return thread;
  }
};

} // namespace comm
