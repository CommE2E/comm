#include "Session.h"
#include "PlatformSpecificTools.h"

#include <stdexcept>

namespace comm {
namespace crypto {

std::unique_ptr<Session> Session::createSessionAsInitializer(
    OlmAccount *account,
    std::uint8_t *ownerIdentityKeys,
    const OlmBuffer &idKeys,
    const OlmBuffer &preKeys,
    const OlmBuffer &oneTimeKeys,
    size_t keyIndex) {
  std::unique_ptr<Session> session(new Session(account, ownerIdentityKeys));

  session->olmSessionBuffer.resize(::olm_session_size());
  session->olmSession = ::olm_session(session->olmSessionBuffer.data());

  OlmBuffer randomBuffer;
  PlatformSpecificTools::generateSecureRandomBytes(
      randomBuffer,
      ::olm_create_outbound_session_random_length(session->olmSession));

  if (-1 ==
      ::olm_create_outbound_session(
          session->olmSession,
          session->ownerUserAccount,
          idKeys.data() + ID_KEYS_PREFIX_OFFSET,
          KEYSIZE,
          preKeys.data() + PRE_KEY_PREFIX_OFFSET,
          KEYSIZE,
          oneTimeKeys.data() + ONE_TIME_KEYS_PREFIX_OFFSET +
              (KEYSIZE + ONE_TIME_KEYS_MIDDLE_OFFSET) * keyIndex,
          KEYSIZE,
          randomBuffer.data(),
          randomBuffer.size())) {
    throw std::runtime_error(
        "error createOutbound => ::olm_create_outbound_session");
  }
  return session;
}

std::unique_ptr<Session> Session::createSessionAsResponder(
    OlmAccount *account,
    std::uint8_t *ownerIdentityKeys,
    const OlmBuffer &encryptedMessage,
    const OlmBuffer &idKeys) {
  std::unique_ptr<Session> session(new Session(account, ownerIdentityKeys));

  OlmBuffer tmpEncryptedMessage(encryptedMessage);
  session->olmSessionBuffer.resize(::olm_session_size());
  session->olmSession = ::olm_session(session->olmSessionBuffer.data());
  if (-1 ==
      ::olm_create_inbound_session(
          session->olmSession,
          session->ownerUserAccount,
          tmpEncryptedMessage.data(),
          encryptedMessage.size())) {
    throw std::runtime_error(
        "error createInbound => ::olm_create_inbound_session");
  }
  return session;
}

OlmBuffer Session::storeAsB64(const std::string &secretKey) {
  size_t pickleLength = ::olm_pickle_session_length(this->olmSession);
  OlmBuffer pickle(pickleLength);
  size_t res = ::olm_pickle_session(
      this->olmSession,
      secretKey.data(),
      secretKey.size(),
      pickle.data(),
      pickleLength);
  if (pickleLength != res) {
    throw std::runtime_error("error pickleSession => ::olm_pickle_session");
  }
  return pickle;
}

std::unique_ptr<Session> Session::restoreFromB64(
    OlmAccount *account,
    std::uint8_t *ownerIdentityKeys,
    const std::string &secretKey,
    OlmBuffer &b64) {
  std::unique_ptr<Session> session(new Session(account, ownerIdentityKeys));

  session->olmSessionBuffer.resize(::olm_session_size());
  session->olmSession = ::olm_session(session->olmSessionBuffer.data());
  if (-1 ==
      ::olm_unpickle_session(
          session->olmSession,
          secretKey.data(),
          secretKey.size(),
          b64.data(),
          b64.size())) {
    throw std::runtime_error("error pickleSession => ::olm_unpickle_session");
  }
  return session;
}

OlmSession *Session::getOlmSession() {
  if (this->olmSession == nullptr) {
    throw std::runtime_error(
        "trying to obtain a session pointer of uninitialized session");
  }
  return this->olmSession;
}

} // namespace crypto
} // namespace comm
