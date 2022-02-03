#pragma once

#include "Item.h"

#include "BackupItem.h"
#include "UserPersistItem.h"

#include <memory>
#include <type_traits>

namespace comm {
namespace network {
namespace database {

/**
 * Database structure:
 * userPersist
 *  userID                string
 *  backupIDs             list<string>
 *  recoveryData          bytes
 * backup
 *  id                    string
 *  compactionID          string
 *  encryptedBackupKey    bytes
 *  created               timestamp
 * compaction
 *  id                    string
 *  comapctionHolder      string
 *  attachmentHolders     list<string>
 *  logs                  list<string>
 * log
 *  id                    string
 *  persistedInBlob       bool
 *  value                 bytes
 *  attachmentHolders     list<string>
 */

template <typename T> std::shared_ptr<T> createItemByType() {
  static_assert(std::is_base_of<Item, T>::value, "T must inherit from Item");
  return std::make_shared<T>();
}

} // namespace database
} // namespace network
} // namespace comm
