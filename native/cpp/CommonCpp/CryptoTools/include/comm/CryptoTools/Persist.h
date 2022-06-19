#pragma once

#include <string>
#include <unordered_map>

#include "Tools.h"

namespace comm {
namespace crypto {

struct Persist {
  OlmBuffer account;
  std::unordered_map<std::string, OlmBuffer> sessions;

  bool isEmpty() const {
    return (this->account.size() == 0);
  }
};

} // namespace crypto
} // namespace comm
