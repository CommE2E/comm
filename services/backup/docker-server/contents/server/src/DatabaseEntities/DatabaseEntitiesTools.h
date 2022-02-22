#pragma once

#include "Item.h"

#include <memory>
#include <type_traits>

namespace comm {
namespace network {
namespace database {

template <typename T> std::shared_ptr<T> createItemByType() {
  static_assert(std::is_base_of<Item, T>::value, "T must inherit from Item");
  return std::make_shared<T>();
}

} // namespace database
} // namespace network
} // namespace comm
