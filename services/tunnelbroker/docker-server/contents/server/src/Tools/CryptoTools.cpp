#include "CryptoTools.h"

#include <cryptopp/base64.h>
#include <cryptopp/cryptlib.h>
#include <cryptopp/filters.h>
#include <cryptopp/modes.h>
#include <cryptopp/pssr.h>
#include <cryptopp/rsa.h>

#include <iostream>

namespace comm {
namespace network {
namespace crypto {

bool rsaVerifyString(
    const std::string &publicKeyBase64,
    const std::string &message,
    const std::string &signatureBase64) {

  CryptoPP::RSA::PublicKey publicKey;
  std::string decodedSignature;
  std::unique_ptr<CryptoPP::Base64Decoder> base64Decoder;

  try {
    base64Decoder = std::make_unique<CryptoPP::Base64Decoder>();
    publicKey.Load(
        CryptoPP::StringSource(publicKeyBase64, true, base64Decoder.release())
            .Ref());

    base64Decoder = std::make_unique<CryptoPP::Base64Decoder>(
        std::make_unique<CryptoPP::StringSink>(decodedSignature).release());
    CryptoPP::StringSource stringSource(
        signatureBase64, true, base64Decoder.release());

    CryptoPP::RSASSA_PKCS1v15_SHA_Verifier verifierSha256(publicKey);
    return verifierSha256.VerifyMessage(
        reinterpret_cast<const unsigned char *>(message.c_str()),
        message.length(),
        reinterpret_cast<const unsigned char *>(decodedSignature.c_str()),
        decodedSignature.length());

  } catch (const std::exception &e) {
    std::cout << "CryptoTools: "
              << "Got an exception " << e.what() << std::endl;
    return false;
  }
}

} // namespace crypto
} // namespace network
} // namespace comm
