#pragma once

#include <memory>
#include <string>

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
  int pinned_count;
};

} // namespace comm
