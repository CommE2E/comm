#pragma once

#include "cxx.h"

namespace comm {

template <typename T> class AESCrypto {
public:
  static void generateKey(T buffer);
  static void encrypt(T key, T plaintext, T sealedData);
  static void decrypt(T key, T sealedData, T plaintext);
};

} // namespace comm
