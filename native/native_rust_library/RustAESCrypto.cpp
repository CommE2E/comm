#include "RustAESCrypto.h"
#include "../cpp/CommonCpp/Tools/AESCrypto.h"

namespace comm {

void aesGenerateKey(rust::Slice<uint8_t> buffer){
  std::string error = AESCrypto::generateKey(buffer);
  if(error.size()){
    throw std::runtime_error(error);
  }
}

void aesEncrypt(rust::Slice<uint8_t> key, rust::Slice<uint8_t> plaintext, rust::Slice<uint8_t> sealedData){
  std::string error = AESCrypto::encrypt(key, plaintext, sealedData);
  if(error.size()){
    throw std::runtime_error(error);
  }
}

void aesDecrypt(rust::Slice<uint8_t> key, rust::Slice<uint8_t> sealedData, rust::Slice<uint8_t> plaintext){
  std::string error = AESCrypto::decrypt(key, sealedData, plaintext);
  if(error.size()){
    throw std::runtime_error(error);
  }
}

}