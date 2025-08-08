#pragma once

#import <regex>
#import <string>
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
  FARCASTER_PERSONAL = 17,
  FARCASTER_GROUP = 18,
};

// Regex patterns - should be in sync with lib/utils/validation-utils.js
const std::string UUID_REGEX_STRING =
    "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{"
    "12}";
const std::string FARCASTER_ID_REGEX_STRING =
    "FARCASTER#(?:(?:[0-9a-z]+)|(?:"
    "[0-9]+-[0-9]+))";
const std::string ID_SCHEMA_REGEX_STRING = "(?:" + FARCASTER_ID_REGEX_STRING +
    "|(?:(?:[0-9]+|" + UUID_REGEX_STRING + ")\\|)?(?:[0-9]+|" +
    UUID_REGEX_STRING + "))";

const std::regex ID_SCHEMA_REGEX("^" + ID_SCHEMA_REGEX_STRING + "$");
const std::regex THICK_ID_REGEX("^" + UUID_REGEX_STRING + "$");
const std::regex FARCASTER_ID_REGEX("^" + FARCASTER_ID_REGEX_STRING + "$");

// Helper functions for regex testing
inline bool isSchemaID(const std::string &threadID) {
  return std::regex_match(threadID, ID_SCHEMA_REGEX);
}

inline bool isThickID(const std::string &threadID) {
  return std::regex_match(threadID, THICK_ID_REGEX);
}

inline bool isFarcasterID(const std::string &threadID) {
  return std::regex_match(threadID, FARCASTER_ID_REGEX);
}

inline bool threadIDMatchesKeyserverProtocol(const std::string &threadID) {
  return isSchemaID(threadID) && !isThickID(threadID) &&
      !isFarcasterID(threadID);
}

} // namespace comm
