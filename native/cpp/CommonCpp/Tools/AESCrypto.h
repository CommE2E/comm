#pragma once

#include "cxx.h"

namespace comm {

class AESCrypto {
public:
  static std::string generateKey(rust::Slice<uint8_t> buffer);
  static std::string encrypt(
      rust::Slice<uint8_t> key,
      rust::Slice<uint8_t> plaintext,
      rust::Slice<uint8_t> sealedData);
  static std::string decrypt(
      rust::Slice<uint8_t> key,
      rust::Slice<uint8_t> sealedData,
      rust::Slice<uint8_t> plaintext);
};

} // namespace comm
