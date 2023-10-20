#include "CommRustModule.h"
#include "InternalModules/RustPromiseManager.h"
#include "JSIRust.h"
#include "lib.rs.h"

#include <ReactCommon/TurboModuleUtils.h>

namespace comm {

using namespace facebook::react;

CommRustModule::CommRustModule(std::shared_ptr<CallInvoker> jsInvoker)
    : CommRustModuleSchemaCxxSpecJSI(jsInvoker) {
}

jsi::Value CommRustModule::generateNonce(jsi::Runtime &rt) {
  return createPromiseAsJSIValue(
      rt, [this](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        std::string error;
        try {
          auto currentID = RustPromiseManager::instance.addPromise(
              promise, this->jsInvoker_, innerRt);
          identityGenerateNonce(currentID);
        } catch (const std::exception &e) {
          error = e.what();
        };
      });
}

jsi::Value CommRustModule::registerUser(
    jsi::Runtime &rt,
    jsi::String username,
    jsi::String password,
    jsi::String keyPayload,
    jsi::String keyPayloadSignature,
    jsi::String contentPrekey,
    jsi::String contentPrekeySignature,
    jsi::String notifPrekey,
    jsi::String notifPrekeySignature,
    jsi::Array contentOneTimeKeys,
    jsi::Array notifOneTimeKeys) {
  return createPromiseAsJSIValue(
      rt,
      [this,
       &username,
       &password,
       &keyPayload,
       &keyPayloadSignature,
       &contentPrekey,
       &contentPrekeySignature,
       &notifPrekey,
       &notifPrekeySignature,
       &contentOneTimeKeys,
       &notifOneTimeKeys](
          jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        std::string error;
        try {
          auto currentID = RustPromiseManager::instance.addPromise(
              promise, this->jsInvoker_, innerRt);
          identityRegisterUser(
              jsiStringToRustString(username, innerRt),
              jsiStringToRustString(password, innerRt),
              jsiStringToRustString(keyPayload, innerRt),
              jsiStringToRustString(keyPayloadSignature, innerRt),
              jsiStringToRustString(contentPrekey, innerRt),
              jsiStringToRustString(contentPrekeySignature, innerRt),
              jsiStringToRustString(notifPrekey, innerRt),
              jsiStringToRustString(notifPrekeySignature, innerRt),
              jsiStringArrayToRustVec(contentOneTimeKeys, innerRt),
              jsiStringArrayToRustVec(notifOneTimeKeys, innerRt),
              currentID);
        } catch (const std::exception &e) {
          error = e.what();
        };
      });
}

jsi::Value CommRustModule::loginPasswordUser(
    jsi::Runtime &rt,
    jsi::String username,
    jsi::String password,
    jsi::String keyPayload,
    jsi::String keyPayloadSignature,
    jsi::String contentPrekey,
    jsi::String contentPrekeySignature,
    jsi::String notifPrekey,
    jsi::String notifPrekeySignature,
    jsi::Array contentOneTimeKeys,
    jsi::Array notifOneTimeKeys) {
  return createPromiseAsJSIValue(
      rt,
      [this,
       &username,
       &password,
       &keyPayload,
       &keyPayloadSignature,
       &contentPrekey,
       &contentPrekeySignature,
       &notifPrekey,
       &notifPrekeySignature,
       &contentOneTimeKeys,
       &notifOneTimeKeys](
          jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        std::string error;
        try {
          auto currentID = RustPromiseManager::instance.addPromise(
              promise, this->jsInvoker_, innerRt);
          identityLoginPasswordUser(
              jsiStringToRustString(username, innerRt),
              jsiStringToRustString(password, innerRt),
              jsiStringToRustString(keyPayload, innerRt),
              jsiStringToRustString(keyPayloadSignature, innerRt),
              jsiStringToRustString(contentPrekey, innerRt),
              jsiStringToRustString(contentPrekeySignature, innerRt),
              jsiStringToRustString(notifPrekey, innerRt),
              jsiStringToRustString(notifPrekeySignature, innerRt),
              jsiStringArrayToRustVec(contentOneTimeKeys, innerRt),
              jsiStringArrayToRustVec(notifOneTimeKeys, innerRt),
              currentID);
        } catch (const std::exception &e) {
          error = e.what();
        };
      });
}

jsi::Value CommRustModule::loginWalletUser(
    jsi::Runtime &rt,
    jsi::String siweMessage,
    jsi::String siweSignature,
    jsi::String keyPayload,
    jsi::String keyPayloadSignature,
    jsi::String contentPrekey,
    jsi::String contentPrekeySignature,
    jsi::String notifPrekey,
    jsi::String notifPrekeySignature,
    jsi::Array contentOneTimeKeys,
    jsi::Array notifOneTimeKeys,
    jsi::String socialProof) {
  return createPromiseAsJSIValue(
      rt,
      [this,
       &siweMessage,
       &siweSignature,
       &keyPayload,
       &keyPayloadSignature,
       &contentPrekey,
       &contentPrekeySignature,
       &notifPrekey,
       &notifPrekeySignature,
       &contentOneTimeKeys,
       &notifOneTimeKeys,
       &socialProof](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        std::string error;
        try {
          auto currentID = RustPromiseManager::instance.addPromise(
              promise, this->jsInvoker_, innerRt);
          identityLoginWalletUser(
              jsiStringToRustString(siweMessage, innerRt),
              jsiStringToRustString(siweSignature, innerRt),
              jsiStringToRustString(keyPayload, innerRt),
              jsiStringToRustString(keyPayloadSignature, innerRt),
              jsiStringToRustString(contentPrekey, innerRt),
              jsiStringToRustString(contentPrekeySignature, innerRt),
              jsiStringToRustString(notifPrekey, innerRt),
              jsiStringToRustString(notifPrekeySignature, innerRt),
              jsiStringArrayToRustVec(contentOneTimeKeys, innerRt),
              jsiStringArrayToRustVec(notifOneTimeKeys, innerRt),
              jsiStringToRustString(socialProof, innerRt),
              currentID);
        } catch (const std::exception &e) {
          error = e.what();
        };
      });
}

jsi::Value CommRustModule::updatePassword(
    jsi::Runtime &rt,
    jsi::String userID,
    jsi::String deviceID,
    jsi::String accessToken,
    jsi::String password) {
  return createPromiseAsJSIValue(
      rt,
      [this, &userID, &deviceID, &accessToken, &password](
          jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        std::string error;
        try {
          auto currentID = RustPromiseManager::instance.addPromise(
              promise, this->jsInvoker_, innerRt);
          identityUpdateUserPassword(
              jsiStringToRustString(userID, innerRt),
              jsiStringToRustString(deviceID, innerRt),
              jsiStringToRustString(accessToken, innerRt),
              jsiStringToRustString(password, innerRt),
              currentID);
        } catch (const std::exception &e) {
          error = e.what();
        };
      });
}

jsi::Value CommRustModule::deleteUser(
    jsi::Runtime &rt,
    jsi::String userID,
    jsi::String deviceID,
    jsi::String accessToken) {
  return createPromiseAsJSIValue(
      rt,
      [this, &userID, &deviceID, &accessToken](
          jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        std::string error;
        try {
          auto currentID = RustPromiseManager::instance.addPromise(
              promise, this->jsInvoker_, innerRt);
          identityDeleteUser(
              jsiStringToRustString(userID, innerRt),
              jsiStringToRustString(deviceID, innerRt),
              jsiStringToRustString(accessToken, innerRt),
              currentID);
        } catch (const std::exception &e) {
          error = e.what();
        };
      });
}

jsi::Value CommRustModule::getOutboundKeysForUserDevice(
    jsi::Runtime &rt,
    jsi::String identifierType,
    jsi::String identifierValue,
    jsi::String deviceID) {
  return createPromiseAsJSIValue(
      rt,
      [this, &identifierType, &identifierValue, &deviceID](
          jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        std::string error;
        try {
          auto currentID = RustPromiseManager::instance.addPromise(
              promise, this->jsInvoker_, innerRt);
          identityGetOutboundKeysForUserDevice(
              jsiStringToRustString(identifierType, innerRt),
              jsiStringToRustString(identifierValue, innerRt),
              jsiStringToRustString(deviceID, innerRt),
              currentID);
        } catch (const std::exception &e) {
          error = e.what();
        };
      });
}

} // namespace comm
