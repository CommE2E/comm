#pragma once

#include "DeviceSessionItem.h"
#include "Item.h"
#include "MessageItem.h"
#include "PublicKeyItem.h"
#include "SessionSignItem.h"

#include <memory>

namespace comm {
namespace network {
namespace database {

template <typename T> std::shared_ptr<T> createItemByType() {
  throw std::runtime_error("invalid Item type");
}

template <>
std::shared_ptr<DeviceSessionItem> createItemByType<DeviceSessionItem>();

template <>
std::shared_ptr<SessionSignItem> createItemByType<SessionSignItem>();

template <> std::shared_ptr<PublicKeyItem> createItemByType<PublicKeyItem>();

template <> std::shared_ptr<MessageItem> createItemByType<MessageItem>();

} // namespace database
} // namespace network
} // namespace comm
