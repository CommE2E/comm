#pragma once

#import <vector>

namespace comm {

// Should be in sync with lib/types/thread-types-enum.js
enum class ThreadType {
  SIDEBAR = 5,
  GENESIS_PERSONAL = 6,
  GENESIS_PRIVATE = 7,
  COMMUNITY_ROOT = 8,
  COMMUNITY_ANNOUNCEMENT_ROOT = 9,
  COMMUNITY_OPEN_SUBTHREAD = 3,
  COMMUNITY_OPEN_ANNOUNCEMENT_SUBTHREAD = 10,
  COMMUNITY_SECRET_SUBTHREAD = 4,
  COMMUNITY_SECRET_ANNOUNCEMENT_SUBTHREAD = 11,
  GENESIS = 12,
  LOCAL = 13,
  PERSONAL = 14,
  PRIVATE = 15,
  THICK_SIDEBAR = 16,
};

const std::vector<ThreadType> THICK_THREAD_TYPES{
    ThreadType::LOCAL,
    ThreadType::PERSONAL,
    ThreadType::PRIVATE,
    ThreadType::THICK_SIDEBAR};

} // namespace comm
