#pragma once

#include "DeviceSessionItem.h"
#include "Item.h"

#include <memory>

namespace comm {
namespace network {
namespace database {

template <typename T> std::shared_ptr<T> createItemByType() {
  throw std::runtime_error("invalid Item type");
}

template <>
std::shared_ptr<DeviceSessionItem> createItemByType<DeviceSessionItem>();

} // namespace database
} // namespace network
} // namespace comm
