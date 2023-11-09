#pragma once

#include <memory>
#include <string>

namespace comm {

struct NullableString {
  std::string value;
  bool isNull;

  NullableString() : value(""), isNull(true) {
  }

  NullableString(const std::unique_ptr<std::string> &ptr)
      : value((ptr) ? *ptr : ""), isNull(!ptr) {
  }

  NullableString &operator=(const std::unique_ptr<std::string> &ptr) {
    if (ptr) {
      value = *ptr;
      isNull = false;
    } else {
      value = "";
      isNull = true;
    }
    return *this;
  }

  operator std::unique_ptr<std::string>() const {
    if (isNull) {
      return nullptr;
    } else {
      return std::make_unique<std::string>(value);
    }
  }
};

} // namespace comm
