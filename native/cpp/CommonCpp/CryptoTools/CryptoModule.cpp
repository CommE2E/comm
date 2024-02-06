#include "CryptoModule.h"
#include "Logger.h"
#include "PlatformSpecificTools.h"
#include "olm/account.hh"
#include "olm/session.hh"

#include <ctime>
#include <stdexcept>

namespace comm {
namespace crypto {

CryptoModule::CryptoModule(std::string id) : id{id} {
  this->createAccount();
}

CryptoModule::CryptoModule(
    std::string id,
    std::string secretKey,
    Persist persist)
    : id{id} {
  if (persist.isEmpty()) {
    this->createAccount();
  } else {
    this->restoreFromB64(secretKey, persist);
  }
}

OlmAccount *CryptoModule::getOlmAccount() {
  return reinterpret_cast<OlmAccount *>(this->accountBuffer.data());
}

void CryptoModule::createAccount() {
  this->accountBuffer.resize(::olm_account_size());
  ::olm_account(this->accountBuffer.data());

  size_t randomSize = ::olm_create_account_random_length(this->getOlmAccount());
  OlmBuffer randomBuffer;
  PlatformSpecificTools::generateSecureRandomBytes(randomBuffer, randomSize);

  if (-1 ==
      ::olm_create_account(
          this->getOlmAccount(), randomBuffer.data(), randomSize)) {
    throw std::runtime_error{
        "error createAccount => " +
        std::string{::olm_account_last_error(this->getOlmAccount())}};
  };
}

void CryptoModule::exposePublicIdentityKeys() {
  size_t identityKeysSize =
      ::olm_account_identity_keys_length(this->getOlmAccount());
  if (this->keys.identityKeys.size() == identityKeysSize) {
    return;
  }
  this->keys.identityKeys.resize(
      ::olm_account_identity_keys_length(this->getOlmAccount()));
  if (-1 ==
      ::olm_account_identity_keys(
          this->getOlmAccount(),
          this->keys.identityKeys.data(),
          this->keys.identityKeys.size())) {
    throw std::runtime_error{
        "error generateIdentityKeys => " +
        std::string{::olm_account_last_error(this->getOlmAccount())}};
  }
}

void CryptoModule::generateOneTimeKeys(size_t oneTimeKeysAmount) {
  size_t oneTimeKeysSize = ::olm_account_generate_one_time_keys_random_length(
      this->getOlmAccount(), oneTimeKeysAmount);
  if (this->keys.oneTimeKeys.size() == oneTimeKeysSize) {
    return;
  }
  OlmBuffer random;
  PlatformSpecificTools::generateSecureRandomBytes(random, oneTimeKeysSize);

  if (-1 ==
      ::olm_account_generate_one_time_keys(
          this->getOlmAccount(),
          oneTimeKeysAmount,
          random.data(),
          random.size())) {
    throw std::runtime_error{
        "error generateOneTimeKeys => " +
        std::string{::olm_account_last_error(this->getOlmAccount())}};
  }
}

// returns number of published keys
size_t CryptoModule::publishOneTimeKeys() {
  this->keys.oneTimeKeys.resize(
      ::olm_account_one_time_keys_length(this->getOlmAccount()));
  if (-1 ==
      ::olm_account_one_time_keys(
          this->getOlmAccount(),
          this->keys.oneTimeKeys.data(),
          this->keys.oneTimeKeys.size())) {
    throw std::runtime_error{
        "error publishOneTimeKeys => " +
        std::string{::olm_account_last_error(this->getOlmAccount())}};
  }
  return ::olm_account_mark_keys_as_published(this->getOlmAccount());
}

bool CryptoModule::prekeyExistsAndOlderThan(uint64_t threshold) {
  // Our fork of Olm only remembers two prekeys at a time.
  // If the new one hasn't been published, then the old one is still active.
  // In that scenario, we need to avoid rotating the prekey because it will
  // result in the old active prekey being discarded.
  if (this->getUnpublishedPrekey().has_value()) {
    return false;
  }

  uint64_t currentTime = std::time(nullptr);
  uint64_t lastPrekeyPublishTime =
      ::olm_account_get_last_prekey_publish_time(this->getOlmAccount());

  return currentTime - lastPrekeyPublishTime >= threshold;
}

Keys CryptoModule::keysFromStrings(
    const std::string &identityKeys,
    const std::string &oneTimeKeys) {
  return {
      OlmBuffer(identityKeys.begin(), identityKeys.end()),
      OlmBuffer(oneTimeKeys.begin(), oneTimeKeys.end())};
}

std::string CryptoModule::getIdentityKeys() {
  this->exposePublicIdentityKeys();
  return std::string{
      this->keys.identityKeys.begin(), this->keys.identityKeys.end()};
}

std::string CryptoModule::generateAndGetOneTimeKeys(size_t oneTimeKeysAmount) {
  this->generateOneTimeKeys(oneTimeKeysAmount);
  size_t publishedOneTimeKeys = this->publishOneTimeKeys();
  if (publishedOneTimeKeys != oneTimeKeysAmount) {
    throw std::runtime_error{
        "error generateKeys => invalid amount of one-time keys published. "
        "Expected " +
        std::to_string(oneTimeKeysAmount) + ", got " +
        std::to_string(publishedOneTimeKeys)};
  }

  return std::string{
      this->keys.oneTimeKeys.begin(), this->keys.oneTimeKeys.end()};
}

std::string CryptoModule::getOneTimeKeys(size_t oneTimeKeysAmount) {
  // check how many unpublished one time keys we have
  // generate enough to meet the threshold
  // call publish method (this method also handles writing the otks to a buffer)
  return std::string{
      this->keys.oneTimeKeys.begin(), this->keys.oneTimeKeys.end()};
}

std::uint8_t CryptoModule::getNumPrekeys() {
  return reinterpret_cast<olm::Account *>(this->getOlmAccount())->num_prekeys;
}

std::string CryptoModule::getPrekey() {
  OlmBuffer prekey;
  prekey.resize(::olm_account_prekey_length(this->getOlmAccount()));

  if (-1 ==
      ::olm_account_prekey(
          this->getOlmAccount(), prekey.data(), prekey.size())) {
    throw std::runtime_error{
        "error getPrekey => " +
        std::string{::olm_account_last_error(this->getOlmAccount())}};
  }

  return std::string{std::string{prekey.begin(), prekey.end()}};
}

std::string CryptoModule::getPrekeySignature() {
  size_t signatureSize = ::olm_account_signature_length(this->getOlmAccount());

  OlmBuffer signatureBuffer;
  signatureBuffer.resize(signatureSize);

  if (-1 ==
      ::olm_account_prekey_signature(
          this->getOlmAccount(), signatureBuffer.data())) {
    throw std::runtime_error{
        "error getPrekeySignature => " +
        std::string{::olm_account_last_error(this->getOlmAccount())}};
  }

  return std::string{signatureBuffer.begin(), signatureBuffer.end()};
}

std::optional<std::string> CryptoModule::getUnpublishedPrekey() {
  OlmBuffer prekey;
  prekey.resize(::olm_account_prekey_length(this->getOlmAccount()));

  std::size_t retval = ::olm_account_unpublished_prekey(
      this->getOlmAccount(), prekey.data(), prekey.size());

  if (0 == retval) {
    return std::nullopt;
  } else if (-1 == retval) {
    throw std::runtime_error{
        "error getUnpublishedPrekey => " +
        std::string{::olm_account_last_error(this->getOlmAccount())}};
  }

  return std::string{prekey.begin(), prekey.end()};
}

std::string CryptoModule::generateAndGetPrekey() {
  size_t prekeySize =
      ::olm_account_generate_prekey_random_length(this->getOlmAccount());

  OlmBuffer random;
  PlatformSpecificTools::generateSecureRandomBytes(random, prekeySize);

  if (-1 ==
      ::olm_account_generate_prekey(
          this->getOlmAccount(), random.data(), random.size())) {
    throw std::runtime_error{
        "error generateAndGetPrekey => " +
        std::string{::olm_account_last_error(this->getOlmAccount())}};
  }

  OlmBuffer prekey;
  prekey.resize(::olm_account_prekey_length(this->getOlmAccount()));

  if (-1 ==
      ::olm_account_prekey(
          this->getOlmAccount(), prekey.data(), prekey.size())) {
    throw std::runtime_error{
        "error generateAndGetPrekey => " +
        std::string{::olm_account_last_error(this->getOlmAccount())}};
  }

  return std::string{prekey.begin(), prekey.end()};
}

void CryptoModule::markPrekeyAsPublished() {
  ::olm_account_mark_prekey_as_published(this->getOlmAccount());
}

void CryptoModule::forgetOldPrekey() {
  ::olm_account_forget_old_prekey(this->getOlmAccount());
}

void CryptoModule::initializeInboundForReceivingSession(
    const std::string &targetDeviceId,
    const OlmBuffer &encryptedMessage,
    const OlmBuffer &idKeys,
    const bool overwrite) {
  if (this->hasSessionFor(targetDeviceId)) {
    if (overwrite) {
      this->sessions.erase(this->sessions.find(targetDeviceId));
    } else {
      throw std::runtime_error{
          "error initializeInboundForReceivingSession => session already "
          "initialized"};
    }
  }
  std::unique_ptr<Session> newSession = Session::createSessionAsResponder(
      this->getOlmAccount(),
      this->keys.identityKeys.data(),
      encryptedMessage,
      idKeys);
  this->sessions.insert(make_pair(targetDeviceId, std::move(newSession)));
}

void CryptoModule::initializeOutboundForSendingSession(
    const std::string &targetDeviceId,
    const OlmBuffer &idKeys,
    const OlmBuffer &preKeys,
    const OlmBuffer &preKeySignature,
    const OlmBuffer &oneTimeKeys,
    size_t keyIndex) {
  if (this->hasSessionFor(targetDeviceId)) {
    Logger::log(
        "olm session overwritten for the device with id: " + targetDeviceId);
    this->sessions.erase(this->sessions.find(targetDeviceId));
  }
  std::unique_ptr<Session> newSession = Session::createSessionAsInitializer(
      this->getOlmAccount(),
      this->keys.identityKeys.data(),
      idKeys,
      preKeys,
      preKeySignature,
      oneTimeKeys,
      keyIndex);
  this->sessions.insert(make_pair(targetDeviceId, std::move(newSession)));
}

bool CryptoModule::hasSessionFor(const std::string &targetDeviceId) {
  return (this->sessions.find(targetDeviceId) != this->sessions.end());
}

std::shared_ptr<Session>
CryptoModule::getSessionByDeviceId(const std::string &deviceId) {
  return this->sessions.at(deviceId);
}

Persist CryptoModule::storeAsB64(const std::string &secretKey) {
  Persist persist;
  size_t accountPickleLength =
      ::olm_pickle_account_length(this->getOlmAccount());
  OlmBuffer accountPickleBuffer(accountPickleLength);
  if (accountPickleLength !=
      ::olm_pickle_account(
          this->getOlmAccount(),
          secretKey.data(),
          secretKey.size(),
          accountPickleBuffer.data(),
          accountPickleLength)) {
    throw std::runtime_error{
        "error storeAsB64 => " +
        std::string{::olm_account_last_error(this->getOlmAccount())}};
  }
  persist.account = accountPickleBuffer;

  std::unordered_map<std::string, std::shared_ptr<Session>>::iterator it;
  for (it = this->sessions.begin(); it != this->sessions.end(); ++it) {
    OlmBuffer buffer = it->second->storeAsB64(secretKey);
    persist.sessions.insert(make_pair(it->first, buffer));
  }

  return persist;
}

void CryptoModule::restoreFromB64(
    const std::string &secretKey,
    Persist persist) {
  this->accountBuffer.resize(::olm_account_size());
  ::olm_account(this->accountBuffer.data());
  if (-1 ==
      ::olm_unpickle_account(
          this->getOlmAccount(),
          secretKey.data(),
          secretKey.size(),
          persist.account.data(),
          persist.account.size())) {
    throw std::runtime_error{
        "error restoreFromB64 => " +
        std::string{::olm_account_last_error(this->getOlmAccount())}};
  }

  std::unordered_map<std::string, OlmBuffer>::iterator it;
  for (it = persist.sessions.begin(); it != persist.sessions.end(); ++it) {
    std::unique_ptr<Session> session = session->restoreFromB64(
        this->getOlmAccount(),
        this->keys.identityKeys.data(),
        secretKey,
        it->second);
    this->sessions.insert(make_pair(it->first, move(session)));
  }
}

EncryptedData CryptoModule::encrypt(
    const std::string &targetDeviceId,
    const std::string &content) {
  if (!this->hasSessionFor(targetDeviceId)) {
    throw std::runtime_error{"error encrypt => uninitialized session"};
  }
  OlmSession *session = this->sessions.at(targetDeviceId)->getOlmSession();
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
  return {encryptedMessage, messageType};
}

std::string CryptoModule::decrypt(
    const std::string &targetDeviceId,
    EncryptedData &encryptedData) {
  if (!this->hasSessionFor(targetDeviceId)) {
    throw std::runtime_error{"error decrypt => uninitialized session"};
  }
  OlmSession *session = this->sessions.at(targetDeviceId)->getOlmSession();

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
        "error decrypt => " + std::string{::olm_session_last_error(session)} +
        ". Hash: " +
        std::string{messageHashBuffer.begin(), messageHashBuffer.end()}};
  }
  return std::string{(char *)decryptedMessage.data(), decryptedSize};
}

std::string CryptoModule::signMessage(const std::string &message) {
  OlmBuffer signature;
  signature.resize(::olm_account_signature_length(this->getOlmAccount()));
  size_t signatureLength = ::olm_account_sign(
      this->getOlmAccount(),
      (uint8_t *)message.data(),
      message.length(),
      signature.data(),
      signature.size());
  if (signatureLength == -1) {
    throw std::runtime_error{
        "olm error: " +
        std::string{::olm_account_last_error(this->getOlmAccount())}};
  }
  return std::string{(char *)signature.data(), signatureLength};
}

void CryptoModule::verifySignature(
    const std::string &publicKey,
    const std::string &message,
    const std::string &signature) {
  OlmBuffer utilityBuffer;
  utilityBuffer.resize(::olm_utility_size());
  OlmUtility *olmUtility = ::olm_utility(utilityBuffer.data());
  ssize_t verificationResult = ::olm_ed25519_verify(
      olmUtility,
      (uint8_t *)publicKey.data(),
      publicKey.length(),
      (uint8_t *)message.data(),
      message.length(),
      (uint8_t *)signature.data(),
      signature.length());
  if (verificationResult == -1) {
    throw std::runtime_error{
        "olm error: " + std::string{::olm_utility_last_error(olmUtility)}};
  }
}

std::optional<std::string> CryptoModule::validatePrekey() {
  static const uint64_t maxPrekeyPublishTime = 10 * 60;
  static const uint64_t maxOldPrekeyAge = 2 * 60;
  std::optional<std::string> maybeNewPrekey;

  bool shouldRotatePrekey =
      this->prekeyExistsAndOlderThan(maxPrekeyPublishTime);
  if (shouldRotatePrekey) {
    maybeNewPrekey = this->generateAndGetPrekey();
  }

  bool shouldForgetPrekey = this->prekeyExistsAndOlderThan(maxOldPrekeyAge);
  if (shouldForgetPrekey) {
    this->forgetOldPrekey();
  }

  return maybeNewPrekey;
}

} // namespace crypto
} // namespace comm
