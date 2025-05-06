#pragma once

#include <string>
#include <unordered_set>

namespace comm {
class SQLiteBackup {
public:
  static std::unordered_set<std::string> tablesAllowlist;
};
} // namespace comm
