#include "CryptoModule.h"
#include "Logger.h"
#include "PlatformSpecificTools.h"
#include "olm/account.hh"
#include "olm/session.hh"

#include <folly/dynamic.h>
#include <folly/json.h>
#include <ctime>
#include <stdexcept>

namespace comm {
namespace crypto {

// This definition should remain in sync with the value defined in
// the corresponding JavaScript file at `lib/utils/olm-utils.js`.
const std::string SESSION_DOES_NOT_EXIST_ERROR{"SESSION_DOES_NOT_EXIST"};
const std::string INVALID_SESSION_VERSION_ERROR{"INVALID_SESSION_VERSION"};

CryptoModule::CryptoModule() {
  this->createAccount();
}

CryptoModule::CryptoModule(std::string secretKey, Persist persist) {
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
  size_t numRandomBytesRequired =
      ::olm_account_generate_one_time_keys_random_length(
          this->getOlmAccount(), oneTimeKeysAmount);
  OlmBuffer random;
  PlatformSpecificTools::generateSecureRandomBytes(
      random, numRandomBytesRequired);

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

bool CryptoModule::prekeyNotExists() {
  // Prekey generation when creating an Olm Account was added to clients
  // after the initial launch of Olm. Because of that, there is a high
  // chance there are users who have the account without a generated prekey.

  const std::string emptyPrekey(KEYSIZE, 'A');
  const std::string emptySignature(SIGNATURESIZE, 'A');

  std::string prekey = this->getPrekey();
  std::string signature = this->getPrekeySignature();

  return prekey.find(emptyPrekey) != std::string::npos ||
      signature == emptySignature;
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

std::string
CryptoModule::getOneTimeKeysForPublishing(size_t oneTimeKeysAmount) {
  OlmBuffer unpublishedOneTimeKeys;
  unpublishedOneTimeKeys.resize(
      ::olm_account_one_time_keys_length(this->getOlmAccount()));
  if (-1 ==
      ::olm_account_one_time_keys(
          this->getOlmAccount(),
          unpublishedOneTimeKeys.data(),
          unpublishedOneTimeKeys.size())) {
    throw std::runtime_error{
        "error getOneTimeKeysForPublishing => " +
        std::string{::olm_account_last_error(this->getOlmAccount())}};
  }
  std::string unpublishedKeysString =
      std::string{unpublishedOneTimeKeys.begin(), unpublishedOneTimeKeys.end()};

  folly::dynamic parsedUnpublishedKeys =
      folly::parseJson(unpublishedKeysString);

  size_t numUnpublishedKeys = parsedUnpublishedKeys["curve25519"].size();

  if (numUnpublishedKeys < oneTimeKeysAmount) {
    this->generateOneTimeKeys(oneTimeKeysAmount - numUnpublishedKeys);
  }

  this->publishOneTimeKeys();

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
    int sessionVersion,
    const bool overwrite) {
  if (this->hasSessionFor(targetDeviceId)) {
    std::shared_ptr<Session> existingSession =
        getSessionByDeviceId(targetDeviceId);
    if (existingSession->getVersion() > sessionVersion) {
      throw std::runtime_error{"OLM_SESSION_ALREADY_CREATED"};
    } else if (existingSession->getVersion() == sessionVersion) {
      throw std::runtime_error{"OLM_SESSION_CREATION_RACE_CONDITION"};
    }

    this->sessions.erase(this->sessions.find(targetDeviceId));
  }
  std::unique_ptr<Session> newSession = Session::createSessionAsResponder(
      this->getOlmAccount(),
      this->keys.identityKeys.data(),
      encryptedMessage,
      idKeys);
  newSession->setVersion(sessionVersion);
  this->sessions.insert(make_pair(targetDeviceId, std::move(newSession)));
}

int CryptoModule::initializeOutboundForSendingSession(
    const std::string &targetDeviceId,
    const OlmBuffer &idKeys,
    const OlmBuffer &preKeys,
    const OlmBuffer &preKeySignature,
    const std::optional<OlmBuffer> &oneTimeKey) {
  int newSessionVersion = 1;
  if (this->hasSessionFor(targetDeviceId)) {
    std::shared_ptr<Session> existingSession =
        getSessionByDeviceId(targetDeviceId);
    newSessionVersion = existingSession->getVersion() + 1;
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
      oneTimeKey);
  newSession->setVersion(newSessionVersion);
  this->sessions.insert(make_pair(targetDeviceId, std::move(newSession)));
  return newSessionVersion;
}

bool CryptoModule::hasSessionFor(const std::string &targetDeviceId) {
  return (this->sessions.find(targetDeviceId) != this->sessions.end());
}

std::shared_ptr<Session>
CryptoModule::getSessionByDeviceId(const std::string &deviceId) {
  return this->sessions.at(deviceId);
}

void CryptoModule::removeSessionByDeviceId(const std::string &deviceId) {
  this->sessions.erase(deviceId);
}

OlmBuffer CryptoModule::pickleAccount(const std::string &secretKey) {
  OlmAccount *olmAccount = this->getOlmAccount();
  size_t accountPickleLength = ::olm_pickle_account_length(olmAccount);
  OlmBuffer accountPickleBuffer(accountPickleLength);

  size_t result = ::olm_pickle_account(
      olmAccount,
      secretKey.data(),
      secretKey.size(),
      accountPickleBuffer.data(),
      accountPickleLength);

  if (accountPickleLength != result) {
    throw std::runtime_error(
        "Error in pickleAccount => " +
        std::string(::olm_account_last_error(olmAccount)));
  }
  return accountPickleBuffer;
}

Persist CryptoModule::storeAsB64(const std::string &secretKey) {
  Persist persist;
  persist.account = this->pickleAccount(secretKey);

  std::unordered_map<std::string, std::shared_ptr<Session>>::iterator it;
  for (it = this->sessions.begin(); it != this->sessions.end(); ++it) {
    OlmBuffer buffer = it->second->storeAsB64(secretKey);
    SessionPersist sessionPersist{buffer, it->second->getVersion()};
    persist.sessions.insert(make_pair(it->first, sessionPersist));
  }

  return persist;
}

std::string CryptoModule::pickleAccountToString(const std::string &secretKey) {
  OlmBuffer pickledAccount = this->pickleAccount(secretKey);
  return std::string(pickledAccount.begin(), pickledAccount.end());
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

  std::unordered_map<std::string, SessionPersist>::iterator it;
  for (it = persist.sessions.begin(); it != persist.sessions.end(); ++it) {
    std::unique_ptr<Session> session =
        session->restoreFromB64(secretKey, it->second.buffer);
    session->setVersion(it->second.version);
    this->sessions.insert(make_pair(it->first, move(session)));
  }
}

EncryptedData CryptoModule::encrypt(
    const std::string &targetDeviceId,
    const std::string &content) {
  if (!this->hasSessionFor(targetDeviceId)) {
    throw std::runtime_error{SESSION_DOES_NOT_EXIST_ERROR};
  }
  return this->sessions.at(targetDeviceId)->encrypt(content);
}

std::string CryptoModule::decrypt(
    const std::string &targetDeviceId,
    EncryptedData &encryptedData) {
  if (!this->hasSessionFor(targetDeviceId)) {
    throw std::runtime_error{SESSION_DOES_NOT_EXIST_ERROR};
  }
  auto session = this->sessions.at(targetDeviceId);
  if (encryptedData.sessionVersion.has_value() &&
      encryptedData.sessionVersion.value() < session->getVersion()) {
    throw std::runtime_error{INVALID_SESSION_VERSION_ERROR};
  }
  return session->decrypt(encryptedData);
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

  bool prekeyNotExists = this->prekeyNotExists();
  if (prekeyNotExists) {
    return this->generateAndGetPrekey();
  }

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
