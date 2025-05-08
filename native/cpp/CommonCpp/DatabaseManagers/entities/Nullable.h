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

  Nullable(const std::optional<T> &opt)
      : value(opt.value_or(T())), isNull(!opt.has_value()) {
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

  Nullable &operator=(const std::optional<T> &opt) {
    if (opt.has_value()) {
      value = *opt;
      isNull = false;
    } else {
      value = T();
      isNull = true;
    }
    return *this;
  }

  std::optional<T> resetValue() const {
    return isNull ? std::nullopt : std::optional<T>(value);
  }
};

using NullableString = Nullable<std::string>;
using NullableInt = Nullable<int>;

} // namespace comm
