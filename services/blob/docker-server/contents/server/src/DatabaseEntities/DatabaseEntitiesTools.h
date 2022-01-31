#pragma once

#include "Item.h"

#include "BlobItem.h"
#include "ReverseIndexItem.h"

#include <memory>
#include <type_traits>

namespace comm {
namespace network {
namespace database {

/**
 * Database Structure:
 * blob
 *  blobHash            string
 *  s3Path              string
 *  created             timestamp
 * reverse_index
 *  holder              string
 *  blobHash            string
 */

template <typename T> std::shared_ptr<T> createItemByType() {
  static_assert(std::is_base_of<Item, T>::value, "T must inherit from Item");
  return std::make_shared<T>();
}

} // namespace database
} // namespace network
} // namespace comm
