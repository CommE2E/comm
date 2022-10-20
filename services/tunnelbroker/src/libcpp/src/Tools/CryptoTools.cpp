#include "CryptoTools.h"

#include <cryptopp/base64.h>
#include <cryptopp/filters.h>
#include <cryptopp/rsa.h>
#include <glog/logging.h>

namespace comm {
namespace network {
namespace crypto {

bool rsaVerifyString(
    const std::string &publicKeyBase64,
    const std::string &message,
    const std::string &signatureBase64) {
  CryptoPP::RSA::PublicKey publicKey;
  std::string decodedSignature;
  try {
    publicKey.Load(CryptoPP::StringSource(
                       publicKeyBase64, true, new CryptoPP::Base64Decoder())
                       .Ref());
    CryptoPP::StringSource stringSource(
        signatureBase64,
        true,
        new CryptoPP::Base64Decoder(
            new CryptoPP::StringSink(decodedSignature)));
    CryptoPP::RSASSA_PKCS1v15_SHA_Verifier verifierSha256(publicKey);
    return verifierSha256.VerifyMessage(
        reinterpret_cast<const unsigned char *>(message.c_str()),
        message.length(),
        reinterpret_cast<const unsigned char *>(decodedSignature.c_str()),
        decodedSignature.length());
  } catch (const std::exception &e) {
    LOG(ERROR) << "CryptoTools: "
               << "Got an exception " << e.what();
    return false;
  }
}

} // namespace crypto
} // namespace network
} // namespace comm
