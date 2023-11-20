#pragma once

#include "cxx.h"

namespace comm {

class AESCrypto {
public:
  static void generateKey(rust::Slice<uint8_t> buffer);
  static void encrypt(
      rust::Slice<uint8_t> key,
      rust::Slice<uint8_t> plaintext,
      rust::Slice<uint8_t> sealedData);
  static void decrypt(
      rust::Slice<uint8_t> key,
      rust::Slice<uint8_t> sealedData,
      rust::Slice<uint8_t> plaintext);
};

} // namespace comm
