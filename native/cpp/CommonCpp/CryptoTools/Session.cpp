#include "Session.h"
#include "PlatformSpecificTools.h"

#include <optional>
#include <stdexcept>

namespace comm {
namespace crypto {

// this constant has to match OLM_ERROR_FLAG constant in
// lib/utils/olm-utils.js
static const std::string olmErrorFlag = "OLM_ERROR";

OlmSession *Session::getOlmSession() {
  return reinterpret_cast<OlmSession *>(this->olmSessionBuffer.data());
}

std::unique_ptr<Session> Session::createSessionAsInitializer(
    OlmAccount *account,
    std::uint8_t *ownerIdentityKeys,
    const OlmBuffer &idKeys,
    const OlmBuffer &preKeys,
    const OlmBuffer &preKeySignature,
    const std::optional<OlmBuffer> &oneTimeKey) {
  std::unique_ptr<Session> session(new Session());

  session->olmSessionBuffer.resize(::olm_session_size());
  ::olm_session(session->olmSessionBuffer.data());

  OlmBuffer randomBuffer;
  PlatformSpecificTools::generateSecureRandomBytes(
      randomBuffer,
      ::olm_create_outbound_session_random_length(session->getOlmSession()));

  if (oneTimeKey) {
    if (-1 ==
        ::olm_create_outbound_session(
            session->getOlmSession(),
            account,
            idKeys.data() + ID_KEYS_PREFIX_OFFSET,
            KEYSIZE,
            idKeys.data() + SIGNING_KEYS_PREFIX_OFFSET,
            KEYSIZE,
            preKeys.data(),
            KEYSIZE,
            preKeySignature.data(),
            SIGNATURESIZE,
            oneTimeKey->data(),
            KEYSIZE,
            randomBuffer.data(),
            randomBuffer.size())) {
      throw std::runtime_error(
          "error createOutbound => " +
          std::string{::olm_session_last_error(session->getOlmSession())});
    }
    return session;
  }
  if (-1 ==
      ::olm_create_outbound_session_without_otk(
          session->getOlmSession(),
          account,
          idKeys.data() + ID_KEYS_PREFIX_OFFSET,
          KEYSIZE,
          idKeys.data() + SIGNING_KEYS_PREFIX_OFFSET,
          KEYSIZE,
          preKeys.data(),
          KEYSIZE,
          preKeySignature.data(),
          SIGNATURESIZE,
          randomBuffer.data(),
          randomBuffer.size())) {
    throw std::runtime_error(
        "error createOutbound => " +
        std::string{::olm_session_last_error(session->getOlmSession())});
  }
  return session;
}

std::unique_ptr<Session> Session::createSessionAsResponder(
    OlmAccount *account,
    std::uint8_t *ownerIdentityKeys,
    const OlmBuffer &encryptedMessage,
    const OlmBuffer &idKeys) {
  std::unique_ptr<Session> session(new Session());

  OlmBuffer tmpEncryptedMessage(encryptedMessage);
  session->olmSessionBuffer.resize(::olm_session_size());
  ::olm_session(session->olmSessionBuffer.data());
  if (-1 ==
      ::olm_create_inbound_session_from(
          session->getOlmSession(),
          account,
          idKeys.data() + ID_KEYS_PREFIX_OFFSET,
          KEYSIZE,
          tmpEncryptedMessage.data(),
          encryptedMessage.size())) {
    throw std::runtime_error(
        "error createInbound => " +
        std::string{::olm_session_last_error(session->getOlmSession())});
  }

  if (-1 == ::olm_remove_one_time_keys(account, session->getOlmSession())) {
    throw std::runtime_error(
        "error createInbound (remove oneTimeKey) => " +
        std::string{::olm_session_last_error(session->getOlmSession())});
  }
  return session;
}

OlmBuffer Session::storeAsB64(const std::string &secretKey) {
  size_t pickleLength = ::olm_pickle_session_length(this->getOlmSession());
  OlmBuffer pickle(pickleLength);
  size_t res = ::olm_pickle_session(
      this->getOlmSession(),
      secretKey.data(),
      secretKey.size(),
      pickle.data(),
      pickleLength);
  if (pickleLength != res) {
    throw std::runtime_error("error pickleSession => ::olm_pickle_session");
  }
  return pickle;
}

std::unique_ptr<Session>
Session::restoreFromB64(const std::string &secretKey, OlmBuffer &b64) {
  std::unique_ptr<Session> session(new Session());

  session->olmSessionBuffer.resize(::olm_session_size());
  ::olm_session(session->olmSessionBuffer.data());
  if (-1 ==
      ::olm_unpickle_session(
          session->getOlmSession(),
          secretKey.data(),
          secretKey.size(),
          b64.data(),
          b64.size())) {
    throw std::runtime_error("error pickleSession => ::olm_unpickle_session");
  }
  return session;
}

std::string Session::decrypt(EncryptedData &encryptedData) {
  OlmSession *session = this->getOlmSession();

  OlmBuffer utilityBuffer(::olm_utility_size());
  OlmUtility *olmUtility = ::olm_utility(utilityBuffer.data());

  OlmBuffer messageHashBuffer(::olm_sha256_length(olmUtility));
  ::olm_sha256(
      olmUtility,
      encryptedData.message.data(),
      encryptedData.message.size(),
      messageHashBuffer.data(),
      messageHashBuffer.size());

  OlmBuffer tmpEncryptedMessage(encryptedData.message);
  size_t maxSize = ::olm_decrypt_max_plaintext_length(
      session,
      encryptedData.messageType,
      tmpEncryptedMessage.data(),
      tmpEncryptedMessage.size());

  if (maxSize == -1) {
    throw std::runtime_error{
        "error decrypt_max_plaintext_length => " +
        std::string{::olm_session_last_error(session)} + ". Hash: " +
        std::string{messageHashBuffer.begin(), messageHashBuffer.end()}};
  }

  OlmBuffer decryptedMessage(maxSize);
  size_t decryptedSize = ::olm_decrypt(
      session,
      encryptedData.messageType,
      encryptedData.message.data(),
      encryptedData.message.size(),
      decryptedMessage.data(),
      decryptedMessage.size());
  if (decryptedSize == -1) {
    throw std::runtime_error{
        "error decrypt => " + olmErrorFlag + " " +
        std::string{::olm_session_last_error(session)} + ". Hash: " +
        std::string{messageHashBuffer.begin(), messageHashBuffer.end()}};
  }
  return std::string{(char *)decryptedMessage.data(), decryptedSize};
}

EncryptedData Session::encrypt(const std::string &content) {
  OlmSession *session = this->getOlmSession();
  OlmBuffer encryptedMessage(
      ::olm_encrypt_message_length(session, content.size()));
  OlmBuffer messageRandom;
  PlatformSpecificTools::generateSecureRandomBytes(
      messageRandom, ::olm_encrypt_random_length(session));
  size_t messageType = ::olm_encrypt_message_type(session);
  if (-1 ==
      ::olm_encrypt(
          session,
          (uint8_t *)content.data(),
          content.size(),
          messageRandom.data(),
          messageRandom.size(),
          encryptedMessage.data(),
          encryptedMessage.size())) {
    throw std::runtime_error{
        "error encrypt => " + std::string{::olm_session_last_error(session)}};
  }
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
