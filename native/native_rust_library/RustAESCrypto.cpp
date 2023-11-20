#include "RustAESCrypto.h"
#include "../cpp/CommonCpp/Tools/AESCrypto.h"

namespace comm {

void aesGenerateKey(rust::Slice<uint8_t> buffer){
  AESCrypto::generateKey(buffer);
}

void aesEncrypt(rust::Slice<uint8_t> key, rust::Slice<uint8_t> plaintext, rust::Slice<uint8_t> sealedData){
  AESCrypto::encrypt(key, plaintext, sealedData);
}

void aesDecrypt(rust::Slice<uint8_t> key, rust::Slice<uint8_t> sealedData, rust::Slice<uint8_t> plaintext){
  AESCrypto::decrypt(key, sealedData, plaintext);
}

}
