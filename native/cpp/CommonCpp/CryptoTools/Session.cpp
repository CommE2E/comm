#include "Session.h"
#include "PlatformSpecificTools.h"

#include <optional>
#include <stdexcept>

#include "lib.rs.h"
#ifndef ANDROID
#include "vodozemac_bindings.rs.h"
#endif

namespace comm {
namespace crypto {

// this constant has to match OLM_ERROR_FLAG constant in
// lib/utils/olm-utils.js
static const std::string olmErrorFlag = "OLM_ERROR";


std::unique_ptr<Session> Session::createSessionAsInitializer(
    OlmAccount *account,
    std::uint8_t *ownerIdentityKeys,
    const OlmBuffer &idKeys,
    const OlmBuffer &preKeys,
    const OlmBuffer &preKeySignature,
    const std::optional<OlmBuffer> &oneTimeKey) {
  throw std::runtime_error(":");
//  std::unique_ptr<Session> session(new Session());

//  session->olmSessionBuffer.resize(::olm_session_size());
//  ::olm_session(session->olmSessionBuffer.data());
//
//  OlmBuffer randomBuffer;
//  PlatformSpecificTools::generateSecureRandomBytes(
//      randomBuffer,
//      ::olm_create_outbound_session_random_length(session->getOlmSession()));
//
//  if (oneTimeKey) {
//    if (-1 ==
//        ::olm_create_outbound_session(
//            session->getOlmSession(),
//            account,
//            idKeys.data() + ID_KEYS_PREFIX_OFFSET,
//            KEYSIZE,
//            idKeys.data() + SIGNING_KEYS_PREFIX_OFFSET,
//            KEYSIZE,
//            preKeys.data(),
//            KEYSIZE,
//            preKeySignature.data(),
//            SIGNATURESIZE,
//            oneTimeKey->data(),
//            KEYSIZE,
//            randomBuffer.data(),
//            randomBuffer.size())) {
//      throw std::runtime_error(
//          "error createOutbound => " +
//          std::string{::olm_session_last_error(session->getOlmSession())});
//    }
//    return session;
//  }
//  if (-1 ==
//      ::olm_create_outbound_session_without_otk(
//          session->getOlmSession(),
//          account,
//          idKeys.data() + ID_KEYS_PREFIX_OFFSET,
//          KEYSIZE,
//          idKeys.data() + SIGNING_KEYS_PREFIX_OFFSET,
//          KEYSIZE,
//          preKeys.data(),
//          KEYSIZE,
//          preKeySignature.data(),
//          SIGNATURESIZE,
//          randomBuffer.data(),
//          randomBuffer.size())) {
//    throw std::runtime_error(
//        "error createOutbound => " +
//        std::string{::olm_session_last_error(session->getOlmSession())});
//  }
//  return session;
}

std::unique_ptr<Session> Session::createSessionAsResponder(
    OlmAccount *account,
    std::uint8_t *ownerIdentityKeys,
    const OlmBuffer &encryptedMessage,
    const OlmBuffer &idKeys) {
  throw std::runtime_error(":");
//  std::unique_ptr<Session> session(new Session());

//  OlmBuffer tmpEncryptedMessage(encryptedMessage);
//  session->olmSessionBuffer.resize(::olm_session_size());
//  ::olm_session(session->olmSessionBuffer.data());
//  if (-1 ==
//      ::olm_create_inbound_session_from(
//          session->getOlmSession(),
//          account,
//          idKeys.data() + ID_KEYS_PREFIX_OFFSET,
//          KEYSIZE,
//          tmpEncryptedMessage.data(),
//          encryptedMessage.size())) {
//    throw std::runtime_error(
//        "error createInbound => " +
//        std::string{::olm_session_last_error(session->getOlmSession())});
//  }
//
//  if (-1 == ::olm_remove_one_time_keys(account, session->getOlmSession())) {
//    throw std::runtime_error(
//        "error createInbound (remove oneTimeKey) => " +
//        std::string{::olm_session_last_error(session->getOlmSession())});
//  }
//  return session;
}

OlmBuffer Session::storeAsB64(const std::string &secretKey) {
  // Convert string to 32-byte array (same logic as in vodozemac_bindings)
  std::array<std::uint8_t, 32> key_array;
  const auto* key_bytes = reinterpret_cast<const std::uint8_t*>(secretKey.data());
  std::copy_n(key_bytes, std::min(secretKey.size(), size_t(32)), key_array.begin());
  
  std::string pickle_result = std::string(this->vodozemacSession->pickle(key_array));
  return OlmBuffer(pickle_result.begin(), pickle_result.end());
}

std::unique_ptr<Session>
Session::restoreFromB64(const std::string &secretKey, OlmBuffer &b64) {
  auto vodozemac_session = session_from_pickle(std::string(b64.begin(), b64.end()), secretKey);
  std::unique_ptr<Session> session(new Session(std::move(vodozemac_session)));
  session->secret_key = secretKey;
  return session;
}

std::string Session::decrypt(EncryptedData &encryptedData) {
  auto res = this->vodozemacSession->decrypt(encryptedData.message, encryptedData.messageType);
  return std::string{res};
}

EncryptedData Session::encrypt(const std::string &content) {
  auto res = this->vodozemacSession->encrypt(content);
  auto encryptedMessage = std::string{res->encrypted_message};
  auto messageType = res->message_type;
  
  return {encryptedMessage, messageType, this->getVersion()};
}

int Session::getVersion() {
  return this->version;
}

void Session::setVersion(int newVersion) {
  this->version = newVersion;
}

} // namespace crypto
} // namespace comm
