#pragma once

#include "cxx.h"

namespace comm {

void aesGenerateKey(rust::Slice<uint8_t> buffer);
void aesEncrypt(rust::Slice<uint8_t> key, rust::Slice<uint8_t> plaintext, rust::Slice<uint8_t> sealedData);
void aesDecrypt(rust::Slice<uint8_t> key, rust::Slice<uint8_t> sealedData, rust::Slice<uint8_t> plaintext);

} // namespace comm
