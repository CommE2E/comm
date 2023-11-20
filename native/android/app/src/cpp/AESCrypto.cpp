#include <Tools/AESCrypto.h>

namespace comm {

std::string AESCrypto::generateKey(rust::Slice<uint8_t> buffer) {
  return std::string();
}

std::string AESCrypto::encrypt(
    rust::Slice<uint8_t> key,
    rust::Slice<uint8_t> plaintext,
    rust::Slice<uint8_t> sealedData) {
  return std::string();
}

std::string AESCrypto::decrypt(
    rust::Slice<uint8_t> key,
    rust::Slice<uint8_t> sealedData,
    rust::Slice<uint8_t> plaintext) {
  return std::string();
}

} // namespace comm
