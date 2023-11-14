#pragma once

#include <memory>
#include <string>

namespace comm {

template <typename T> struct Nullable {
  T value;
  bool isNull;

  Nullable() : value(T()), isNull(true) {
  }

  Nullable(const std::unique_ptr<T> &ptr)
      : value((ptr) ? *ptr : T()), isNull(!ptr) {
  }

  Nullable &operator=(const std::unique_ptr<T> &ptr) {
    if (ptr) {
      value = *ptr;
      isNull = false;
    } else {
      value = T();
      isNull = true;
    }
    return *this;
  }

  std::unique_ptr<T> resetValue() const {
    return isNull ? nullptr : std::make_unique<T>(value);
  }
};

using NullableString = Nullable<std::string>;
using NullableInt = Nullable<int>;

} // namespace comm
