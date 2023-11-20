#include <Tools/AESCrypto.h>

namespace comm {

void AESCrypto::generateKey(rust::Slice<uint8_t> buffer) {
}

void AESCrypto::encrypt(
    rust::Slice<uint8_t> key,
    rust::Slice<uint8_t> plaintext,
    rust::Slice<uint8_t> sealedData) {
}

void AESCrypto::decrypt(
    rust::Slice<uint8_t> key,
    rust::Slice<uint8_t> sealedData,
    rust::Slice<uint8_t> plaintext) {
}

} // namespace comm
