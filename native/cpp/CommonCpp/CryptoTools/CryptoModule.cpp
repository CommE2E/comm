#include "CryptoModule.h"
#include "PlatformSpecificTools.h"
#include "olm/session.hh"

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

void CryptoModule::createAccount() {
  this->accountBuffer.resize(::olm_account_size());
  this->account = ::olm_account(this->accountBuffer.data());

  size_t randomSize = ::olm_create_account_random_length(this->account);
  OlmBuffer randomBuffer;
  PlatformSpecificTools::generateSecureRandomBytes(randomBuffer, randomSize);

  if (-1 ==
      ::olm_create_account(this->account, randomBuffer.data(), randomSize)) {
    throw std::runtime_error{"error createAccount => ::olm_create_account"};
  };
}

void CryptoModule::exposePublicIdentityKeys() {
  size_t identityKeysSize = ::olm_account_identity_keys_length(this->account);
  if (this->keys.identityKeys.size() == identityKeysSize) {
    return;
  }
  this->keys.identityKeys.resize(
      ::olm_account_identity_keys_length(this->account));
  if (-1 ==
      ::olm_account_identity_keys(
          this->account,
          this->keys.identityKeys.data(),
          this->keys.identityKeys.size())) {
    throw std::runtime_error{
        "error generateIdentityKeys => ::olm_account_identity_keys"};
  }
}

void CryptoModule::generateOneTimeKeys(size_t oneTimeKeysAmount) {
  size_t oneTimeKeysSize = ::olm_account_generate_one_time_keys_random_length(
      this->account, oneTimeKeysAmount);
  if (this->keys.oneTimeKeys.size() == oneTimeKeysSize) {
    return;
  }
  OlmBuffer random;
  PlatformSpecificTools::generateSecureRandomBytes(random, oneTimeKeysSize);

  if (-1 ==
      ::olm_account_generate_one_time_keys(
          this->account, oneTimeKeysAmount, random.data(), random.size())) {
    throw std::runtime_error{
        "error generateOneTimeKeys => ::olm_account_generate_one_time_keys"};
  }
}

// returns number of published keys
size_t CryptoModule::publishOneTimeKeys() {
  this->keys.oneTimeKeys.resize(
      ::olm_account_one_time_keys_length(this->account));
  if (-1 ==
      ::olm_account_one_time_keys(
          this->account,
          this->keys.oneTimeKeys.data(),
          this->keys.oneTimeKeys.size())) {
    throw std::runtime_error{
        "error publishOneTimeKeys => ::olm_account_one_time_keys"};
  }
  return ::olm_account_mark_keys_as_published(this->account);
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

std::string CryptoModule::getOneTimeKeys(size_t oneTimeKeysAmount) {
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

void CryptoModule::initializeInboundForReceivingSession(
    const std::string &targetUserId,
    const OlmBuffer &encryptedMessage,
    const OlmBuffer &idKeys,
    const bool overwrite) {
  if (this->hasSessionFor(targetUserId)) {
    if (overwrite) {
      this->sessions.erase(this->sessions.find(targetUserId));
    } else {
      throw std::runtime_error{
          "error initializeInboundForReceivingSession => session already "
          "initialized"};
    }
  }
  std::unique_ptr<Session> newSession = Session::createSessionAsResponder(
      this->account, this->keys.identityKeys.data(), encryptedMessage, idKeys);
  this->sessions.insert(make_pair(targetUserId, std::move(newSession)));
}

void CryptoModule::initializeOutboundForSendingSession(
    const std::string &targetUserId,
    const OlmBuffer &idKeys,
    const OlmBuffer &oneTimeKeys,
    size_t keyIndex) {
  if (this->hasSessionFor(targetUserId)) {
    throw std::runtime_error{
        "error initializeOutboundForSendingSession => session already "
        "initialized"};
  }
  std::unique_ptr<Session> newSession = Session::createSessionAsInitializer(
      this->account,
      this->keys.identityKeys.data(),
      idKeys,
      oneTimeKeys,
      keyIndex);
  this->sessions.insert(make_pair(targetUserId, std::move(newSession)));
}

bool CryptoModule::hasSessionFor(const std::string &targetUserId) {
  return (this->sessions.find(targetUserId) != this->sessions.end());
}

std::shared_ptr<Session>
CryptoModule::getSessionByUserId(const std::string &userId) {
  return this->sessions.at(userId);
}

bool CryptoModule::matchesInboundSession(
    const std::string &targetUserId,
    EncryptedData encryptedData,
    const OlmBuffer &theirIdentityKey) const {
  OlmSession *session = this->sessions.at(targetUserId)->getOlmSession();
  // Check that the inbound session matches the message it was created from.
  OlmBuffer tmpEncryptedMessage(encryptedData.message);
  if (1 !=
      ::olm_matches_inbound_session(
          session, tmpEncryptedMessage.data(), tmpEncryptedMessage.size())) {
    return false;
  }

  // Check that the inbound session matches the key this message is supposed
  // to be from.
  tmpEncryptedMessage = OlmBuffer(encryptedData.message);
  return 1 ==
      ::olm_matches_inbound_session_from(
             session,
             theirIdentityKey.data() + ID_KEYS_PREFIX_OFFSET,
             KEYSIZE,
             tmpEncryptedMessage.data(),
             tmpEncryptedMessage.size());
}

Persist CryptoModule::storeAsB64(const std::string &secretKey) {
  Persist persist;
  size_t accountPickleLength = ::olm_pickle_account_length(this->account);
  OlmBuffer accountPickleBuffer(accountPickleLength);
  if (accountPickleLength !=
      ::olm_pickle_account(
          this->account,
          secretKey.data(),
          secretKey.size(),
          accountPickleBuffer.data(),
          accountPickleLength)) {
    throw std::runtime_error{"error storeAsB64 => ::olm_pickle_account"};
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
  this->account = ::olm_account(this->accountBuffer.data());
  if (-1 ==
      ::olm_unpickle_account(
          this->account,
          secretKey.data(),
          secretKey.size(),
          persist.account.data(),
          persist.account.size())) {
    throw std::runtime_error{"error restoreFromB64 => ::olm_unpickle_account"};
  }
  if (persist.account.size() != ::olm_pickle_account_length(this->account)) {
    throw std::runtime_error{
        "error restoreFromB64 => ::olm_pickle_account_length"};
  }

  std::unordered_map<std::string, OlmBuffer>::iterator it;
  for (it = persist.sessions.begin(); it != persist.sessions.end(); ++it) {
    std::unique_ptr<Session> session = session->restoreFromB64(
        this->account, this->keys.identityKeys.data(), secretKey, it->second);
    this->sessions.insert(make_pair(it->first, move(session)));
  }
}

EncryptedData CryptoModule::encrypt(
    const std::string &targetUserId,
    const std::string &content) {
  if (!this->hasSessionFor(targetUserId)) {
    throw std::runtime_error{"error encrypt => uninitialized session"};
  }
  OlmSession *session = this->sessions.at(targetUserId)->getOlmSession();
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
    throw std::runtime_error{"error encrypt => ::olm_encrypt"};
  }
  return {encryptedMessage, messageType};
}

std::string CryptoModule::decrypt(
    const std::string &targetUserId,
    EncryptedData encryptedData,
    const OlmBuffer &theirIdentityKey) {
  if (!this->hasSessionFor(targetUserId)) {
    throw std::runtime_error{"error decrypt => uninitialized session"};
  }
  OlmSession *session = this->sessions.at(targetUserId)->getOlmSession();

  OlmBuffer tmpEncryptedMessage(encryptedData.message);

  if (encryptedData.messageType == (size_t)olm::MessageType::PRE_KEY) {
    if (!this->matchesInboundSession(
            targetUserId, encryptedData, theirIdentityKey)) {
      throw std::runtime_error{"error decrypt => matchesInboundSession"};
    }
  }

  size_t maxSize = ::olm_decrypt_max_plaintext_length(
      session,
      encryptedData.messageType,
      tmpEncryptedMessage.data(),
      tmpEncryptedMessage.size());
  OlmBuffer decryptedMessage(maxSize);
  size_t decryptedSize = ::olm_decrypt(
      session,
      encryptedData.messageType,
      encryptedData.message.data(),
      encryptedData.message.size(),
      decryptedMessage.data(),
      decryptedMessage.size());
  if (decryptedSize == -1) {
    throw std::runtime_error{"error ::olm_decrypt"};
  }
  return std::string{(char *)decryptedMessage.data(), decryptedSize};
}

std::string CryptoModule::signMessage(const std::string &message) {
  OlmBuffer signature;
  signature.resize(::olm_account_signature_length(this->account));
  size_t signatureLength = ::olm_account_sign(
      this->account,
      (uint8_t *)message.data(),
      message.length(),
      signature.data(),
      signature.size());
  if (signatureLength == -1) {
    throw std::runtime_error{
        "olm error: " + std::string{::olm_account_last_error(this->account)}};
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
    throw std::runtime_error{"olm error: " + std::string{}};
  }
}

} // namespace crypto
} // namespace comm
