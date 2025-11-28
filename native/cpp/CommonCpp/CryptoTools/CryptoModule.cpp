#include "CryptoModule.h"
#include "../Tools/OlmUtils.h"
#include "Logger.h"

#include <folly/dynamic.h>
#include <folly/json.h>
#include <ctime>
#include <stdexcept>
#include <string>

#ifndef ANDROID
#include "vodozemac_bindings.rs.h"
#else
#include "lib.rs.h"
#endif

namespace comm {
namespace crypto {

// This definition should remain in sync with the value defined in
// the corresponding JavaScript file at `lib/utils/olm-utils.js`.
const std::string SESSION_DOES_NOT_EXIST_ERROR{"SESSION_DOES_NOT_EXIST"};
const std::string INVALID_SESSION_VERSION_ERROR{"INVALID_SESSION_VERSION"};

CryptoModule::CryptoModule(std::string secretKey, Persist persist)
    : vodozemacAccount(::account_new()) {
  if (!persist.isEmpty()) {
    this->restoreFromB64(secretKey, persist);
  }
}

void CryptoModule::exposePublicIdentityKeys() {
  if (!this->keys.identityKeys.empty()) {
    return;
  }

  std::string ed25519 = std::string(this->vodozemacAccount->ed25519_key());
  std::string curve25519 =
      std::string(this->vodozemacAccount->curve25519_key());

  // Format as JSON: {"ed25519":"...","curve25519":"..."}
  folly::dynamic identityKeys =
      folly::dynamic::object("ed25519", ed25519)("curve25519", curve25519);

  this->keys.identityKeys = folly::toJson(identityKeys);
}

void CryptoModule::generateOneTimeKeys(size_t oneTimeKeysAmount) {
  try {
    this->vodozemacAccount->generate_one_time_keys(oneTimeKeysAmount);
  } catch (const std::exception &e) {
    throw std::runtime_error(
        "error generateOneTimeKeys => " + std::string(e.what()));
  }
}

// returns number of published keys
size_t CryptoModule::publishOneTimeKeys() {
  try {
    auto oneTimeKeysVec = this->vodozemacAccount->one_time_keys();

    this->keys.oneTimeKeys.clear();
    for (const auto &key : oneTimeKeysVec) {
      this->keys.oneTimeKeys.push_back(std::string(key));
    }

    this->vodozemacAccount->mark_keys_as_published();

    return oneTimeKeysVec.size();
  } catch (const std::exception &e) {
    throw std::runtime_error(
        "error publishOneTimeKeys => " + std::string(e.what()));
  }
}

bool CryptoModule::prekeyExistsAndOlderThan(uint64_t threshold) {
  // Our fork of Vodozemac only remembers two prekeys at a time.
  // If the new one hasn't been published, then the old one is still active.
  // In that scenario, we need to avoid rotating the prekey because it will
  // result in the old active prekey being discarded.
  if (this->getUnpublishedPrekey().has_value()) {
    return false;
  }

  uint64_t currentTime = std::time(nullptr);
  uint64_t lastPrekeyPublishTime =
      this->vodozemacAccount->last_prekey_publish_time();

  return currentTime - lastPrekeyPublishTime >= threshold;
}

bool CryptoModule::prekeyDoesntExist() {
  // Prekey generation when creating an Vodozemac Account was added to clients
  // after the initial launch of Vodozemac. Because of that, there is a high
  // chance there are users who have the account without a generated prekey.

  // When prekey or signature is empty it contains bytes with only 0 values.
  // Because of Base64 encoding, 0 is encoded as char `A` and empty
  // prekey/signature is a string built from only `A`'s.
  const std::string emptyPrekey(KEYSIZE, 'A');
  const std::string emptySignature(SIGNATURESIZE, 'A');

  std::string prekey = this->getPrekey();
  std::string signature = this->getPrekeySignature();

  return prekey.find(emptyPrekey) != std::string::npos ||
      signature == emptySignature;
}

bool CryptoModule::isPrekeySignatureValid() {
  try {
    const std::string signingPublicKey =
        getSigningPublicKey(this->getIdentityKeys());

    const std::string prekey = this->getPrekey();
    const std::string prekeySignature = this->getPrekeySignature();

    // Use the dedicated prekey verification function that decodes base64
    ::verify_prekey_signature(signingPublicKey, prekey, prekeySignature);
    return true;
  } catch (const std::exception &e) {
    std::string rawMessage{e.what()};
    if (rawMessage.find("The signature was invalid") != std::string::npos) {
      return false;
    }

    std::string errorMessage{
        "prekey signature verification failed with: " + rawMessage};
    Logger::log(errorMessage);
    throw std::runtime_error(errorMessage);
  }
}

std::string CryptoModule::getIdentityKeys() {
  this->exposePublicIdentityKeys();
  return this->keys.identityKeys;
}

std::vector<std::string>
CryptoModule::getOneTimeKeysForPublishing(size_t oneTimeKeysAmount) {
  try {
    // Get current unpublished keys
    auto oneTimeKeysVec = this->vodozemacAccount->one_time_keys();
    size_t numUnpublishedKeys = oneTimeKeysVec.size();

    // Generate more if needed
    if (numUnpublishedKeys < oneTimeKeysAmount) {
      this->generateOneTimeKeys(oneTimeKeysAmount - numUnpublishedKeys);
    }

    this->publishOneTimeKeys();

    return this->keys.oneTimeKeys;
  } catch (const std::exception &e) {
    throw std::runtime_error(
        "error getOneTimeKeysForPublishing => " + std::string(e.what()));
  }
}

std::string CryptoModule::getPrekey() {
  try {
    return std::string(this->vodozemacAccount->prekey());
  } catch (const std::exception &e) {
    throw std::runtime_error("error getPrekey => " + std::string(e.what()));
  }
}

std::string CryptoModule::getPrekeySignature() {
  try {
    return std::string(this->vodozemacAccount->prekey_signature());
  } catch (const std::exception &e) {
    throw std::runtime_error(
        "error getPrekeySignature => " + std::string(e.what()));
  }
}

std::optional<std::string> CryptoModule::getUnpublishedPrekey() {
  try {
    std::string unpublished =
        std::string(this->vodozemacAccount->unpublished_prekey());
    // NOTE: We use an empty string to represent None because cxx doesn't
    // support Option<&str> in FFI function signatures.
    if (unpublished.empty()) {
      return std::nullopt;
    }
    return unpublished;
  } catch (const std::exception &e) {
    throw std::runtime_error(
        "error getUnpublishedPrekey => " + std::string(e.what()));
  }
}

std::string CryptoModule::generateAndGetPrekey() {
  try {
    this->vodozemacAccount->generate_prekey();
    return std::string(this->vodozemacAccount->prekey());
  } catch (const std::exception &e) {
    throw std::runtime_error(
        "error generateAndGetPrekey => " + std::string(e.what()));
  }
}

void CryptoModule::markPrekeyAsPublished() {
  this->vodozemacAccount->mark_prekey_as_published();
}

void CryptoModule::forgetOldPrekey() {
  this->vodozemacAccount->forget_old_prekey();
}

std::string CryptoModule::initializeInboundForReceivingSession(
    const std::string &targetDeviceId,
    const crypto::EncryptedData &encryptedData,
    const std::string &idKeys,
    int sessionVersion,
    const bool overwrite) {
  if (this->hasSessionFor(targetDeviceId)) {
    std::shared_ptr<Session> existingSession =
        getSessionByDeviceId(targetDeviceId);
    if (!overwrite && existingSession->getVersion() > sessionVersion) {
      throw std::runtime_error{"OLM_SESSION_ALREADY_CREATED"};
    } else if (!overwrite && existingSession->getVersion() == sessionVersion) {
      throw std::runtime_error{"OLM_SESSION_CREATION_RACE_CONDITION"};
    }

    this->sessions.erase(this->sessions.find(targetDeviceId));
  }

  auto [newSession, plaintext] = Session::createSessionAsResponder(
      this->vodozemacAccount, encryptedData, idKeys);
  newSession->setVersion(sessionVersion);
  this->sessions.insert(make_pair(targetDeviceId, std::move(newSession)));
  return plaintext;
}

int CryptoModule::initializeOutboundForSendingSession(
    const std::string &targetDeviceId,
    const std::string &idKeys,
    const std::string &preKeys,
    const std::string &preKeySignature,
    const std::optional<std::string> &oneTimeKey,
    bool olmCompatibilityMode) {
  int newSessionVersion = 1;
  if (this->hasSessionFor(targetDeviceId)) {
    std::shared_ptr<Session> existingSession =
        getSessionByDeviceId(targetDeviceId);
    newSessionVersion = existingSession->getVersion() + 1;
    Logger::log(
        "session overwritten for the device with id: " + targetDeviceId);
    this->sessions.erase(this->sessions.find(targetDeviceId));
  }

  // Use Olm compatibility mode = true for backward compatibility
  std::unique_ptr<Session> newSession = Session::createSessionAsInitializer(
      this->vodozemacAccount,
      idKeys,
      preKeys,
      preKeySignature,
      oneTimeKey,
      olmCompatibilityMode);

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

std::string CryptoModule::pickleAccount(const std::string &secretKey) {
  try {
    // Convert secretKey to 32-byte array
    std::array<uint8_t, 32> key;
    std::copy_n(
        secretKey.begin(), std::min(secretKey.size(), size_t(32)), key.begin());

    return std::string(this->vodozemacAccount->pickle(key));
  } catch (const std::exception &e) {
    throw std::runtime_error("error pickleAccount => " + std::string(e.what()));
  }
}

Persist CryptoModule::storeAsB64(const std::string &secretKey) {
  Persist persist;
  std::string accountPickle = this->pickleAccount(secretKey);
  persist.account = OlmBuffer(accountPickle.begin(), accountPickle.end());

  std::unordered_map<std::string, std::shared_ptr<Session>>::iterator it;
  for (it = this->sessions.begin(); it != this->sessions.end(); ++it) {
    std::string sessionPickle = it->second->storeAsB64(secretKey);
    OlmBuffer buffer(sessionPickle.begin(), sessionPickle.end());
    SessionPersist sessionPersist{buffer, it->second->getVersion()};
    persist.sessions.insert(make_pair(it->first, sessionPersist));
  }

  return persist;
}

std::string CryptoModule::pickleAccountToString(const std::string &secretKey) {
  return this->pickleAccount(secretKey);
}

void CryptoModule::restoreFromB64(
    const std::string &secretKey,
    Persist persist) {
  try {
    std::string accountPickle(persist.account.begin(), persist.account.end());
    this->vodozemacAccount = ::account_from_pickle(accountPickle, secretKey);

    std::unordered_map<std::string, SessionPersist>::iterator it;
    for (it = persist.sessions.begin(); it != persist.sessions.end(); ++it) {
      std::string sessionPickle(
          it->second.buffer.begin(), it->second.buffer.end());
      std::unique_ptr<Session> session =
          Session::restoreFromB64(secretKey, sessionPickle);
      session->setVersion(it->second.version);
      this->sessions.insert(make_pair(it->first, move(session)));
    }
  } catch (const std::exception &e) {
    throw std::runtime_error(
        "error restoreFromB64 => " + std::string(e.what()));
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
  try {
    return std::string(this->vodozemacAccount->sign(message));
  } catch (const std::exception &e) {
    throw std::runtime_error("error signMessage => " + std::string(e.what()));
  }
}

void CryptoModule::verifySignature(
    const std::string &publicKey,
    const std::string &message,
    const std::string &signature) {
  try {
    ::verify_ed25519_signature(publicKey, message, signature);
  } catch (const std::exception &e) {
    throw std::runtime_error(
        "error verifySignature => " + std::string(e.what()));
  }
}

std::optional<std::string> CryptoModule::validatePrekey() {
  static const uint64_t maxPrekeyPublishTime = 30 * 24 * 60 * 60; // 30 days
  static const uint64_t maxOldPrekeyAge = 24 * 60 * 60;           // 24 hours
  std::optional<std::string> maybeNewPrekey;

  bool prekeyDoesntExist = this->prekeyDoesntExist();
  bool prekeySignatureValid = this->isPrekeySignatureValid();
  if (prekeyDoesntExist || !prekeySignatureValid) {
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
