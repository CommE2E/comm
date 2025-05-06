#include "SQLiteBackup.h"

#include <string>
#include <unordered_set>

namespace comm {

std::unordered_set<std::string> SQLiteBackup::tablesAllowlist = {
    "drafts",
    "threads",
    "message_store_threads",
    "users",
    "synced_metadata",
    "aux_users",
    "entries",
};

} // namespace comm
