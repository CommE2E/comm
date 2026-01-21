#include "Session.h"

#include <folly/dynamic.h>
#include <folly/json.h>
#include <stdexcept>

#ifndef ANDROID
#include "vodozemac_bindings.rs.h"
#else
#include "lib.rs.h"
#endif

namespace comm {
namespace crypto {

// this constant has to match OLM_ERROR_FLAG constant in
// lib/utils/olm-utils.js
static const std::string olmErrorFlag = "OLM_ERROR";

std::unique_ptr<Session> Session::createSessionAsInitializer(
    ::rust::Box<::VodozemacAccount> &account,
    const std::string &idKeys,
    const std::string &preKeys,
    const std::string &preKeySignature,
    const std::optional<std::string> &oneTimeKey) {

  try {
    // Parse identity keys JSON
    folly::dynamic idKeysObj = folly::parseJson(idKeys);
    std::string curve25519Key = idKeysObj["curve25519"].asString();
    std::string ed25519Key = idKeysObj["ed25519"].asString();

    // Create outbound session
    ::rust::Box<::VodozemacSession> vodozemacSession =
        account->create_outbound_session(
            curve25519Key,
            ed25519Key,
            // NOTE: We use an empty string to represent None because cxx
            // doesn't support Option<&str> in FFI function signatures.
            oneTimeKey.value_or(""),
            preKeys,
            preKeySignature);

    return std::unique_ptr<Session>(new Session(std::move(vodozemacSession)));
  } catch (const std::exception &e) {
    throw std::runtime_error(
        "error createOutbound => " + std::string(e.what()));
  }
}

std::pair<std::unique_ptr<Session>, std::string>
Session::createSessionAsResponder(
    ::rust::Box<::VodozemacAccount> &account,
    const crypto::EncryptedData &encryptedData,
    const std::string &idKeys) {

  try {
    // Parse identity keys JSON
    folly::dynamic idKeysObj = folly::parseJson(idKeys);
    std::string curve25519Key = idKeysObj["curve25519"].asString();

    auto encryptResult =
        ::encrypt_result_new(encryptedData.message, encryptedData.messageType);
    auto result =
        account->create_inbound_session(curve25519Key, *encryptResult);

    std::string plaintext = std::string(result->plaintext());

    ::rust::Box<::VodozemacSession> vodozemacSession = result->take_session();

    return std::make_pair(
        std::unique_ptr<Session>(new Session(std::move(vodozemacSession))),
        plaintext);
  } catch (const std::exception &e) {
    throw std::runtime_error("error createInbound => " + std::string(e.what()));
  }
}

std::string Session::storeAsB64(const std::string &secretKey) {
  try {
    // Convert secretKey to 32-byte array
    std::array<uint8_t, 32> key;
    std::copy_n(
        secretKey.begin(), std::min(secretKey.size(), size_t(32)), key.begin());

    return std::string(this->vodozemacSession->pickle(key));
  } catch (const std::exception &e) {
    throw std::runtime_error("error pickleSession => " + std::string(e.what()));
  }
}

std::unique_ptr<Session>
Session::restoreFromB64(const std::string &secretKey, const std::string &b64) {
  try {
    ::rust::Box<::VodozemacSession> vodozemacSession =
        ::session_from_pickle(b64, secretKey);

    return std::unique_ptr<Session>(new Session(std::move(vodozemacSession)));
  } catch (const std::exception &e) {
    throw std::runtime_error(
        "error restoreFromB64 => " + std::string(e.what()));
  }
}

std::string Session::decrypt(EncryptedData &encryptedData) {
  try {
    return std::string(this->vodozemacSession->decrypt(
        encryptedData.message,
        static_cast<uint32_t>(encryptedData.messageType)));
  } catch (const std::exception &e) {
    // Compute message hash for debugging
    rust::Slice<const uint8_t> messageSlice{
        reinterpret_cast<const uint8_t *>(encryptedData.message.data()),
        encryptedData.message.size()};
    std::string messageHash = std::string(::sha256(messageSlice));

    throw std::runtime_error(
        "error decrypt => " + olmErrorFlag + " " + std::string(e.what()) +
        ", message hash: " + messageHash);
  }
}

EncryptedData Session::encrypt(const std::string &content) {
  try {
    auto result = this->vodozemacSession->encrypt(content);

    return EncryptedData{
        std::string(result->encrypted_message()),
        result->message_type(),
        this->getVersion()};
  } catch (const std::exception &e) {
    throw std::runtime_error("error encrypt => " + std::string(e.what()));
  }
}

int Session::getVersion() {
  return this->version;
}

void Session::setVersion(int newVersion) {
  this->version = newVersion;
}

bool Session::isSenderChainEmpty() const {
  return this->vodozemacSession->is_sender_chain_empty();
}

bool Session::hasReceivedMessage() const {
  return this->vodozemacSession->has_received_message();
}

} // namespace crypto
} // namespace comm
