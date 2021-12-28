#pragma once

#include "Item.h"

#include "BlobItem.h"
#include "ReverseIndexItem.h"

#include <memory>

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
  throw std::runtime_error("invalid Item type");
}

template <> std::shared_ptr<BlobItem> createItemByType<BlobItem>();

template <>
std::shared_ptr<ReverseIndexItem> createItemByType<ReverseIndexItem>();

} // namespace database
} // namespace network
} // namespace comm
