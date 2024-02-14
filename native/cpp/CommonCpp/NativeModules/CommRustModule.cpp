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
              {promise, this->jsInvoker_, innerRt});
          identityGenerateNonce(currentID);
        } catch (const std::exception &e) {
          error = e.what();
        };
        if (!error.empty()) {
          this->jsInvoker_->invokeAsync(
              [error, promise]() { promise->reject(error); });
        }
      });
}

jsi::Value CommRustModule::registerPasswordUser(
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
  auto usernameRust = jsiStringToRustString(username, rt);
  auto passwordRust = jsiStringToRustString(password, rt);
  auto keyPayloadRust = jsiStringToRustString(keyPayload, rt);
  auto keyPayloadSignatureRust = jsiStringToRustString(keyPayloadSignature, rt);
  auto contentPrekeyRust = jsiStringToRustString(contentPrekey, rt);
  auto contentPrekeySignatureRust =
      jsiStringToRustString(contentPrekeySignature, rt);
  auto notifPrekeyRust = jsiStringToRustString(notifPrekey, rt);
  auto notifPrekeySignatureRust =
      jsiStringToRustString(notifPrekeySignature, rt);
  auto contentOneTimeKeysRust = jsiStringArrayToRustVec(contentOneTimeKeys, rt);
  auto notifOneTimeKeysRust = jsiStringArrayToRustVec(notifOneTimeKeys, rt);

  return createPromiseAsJSIValue(
      rt, [=, this](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        std::string error;
        try {
          auto currentID = RustPromiseManager::instance.addPromise(
              {promise, this->jsInvoker_, innerRt});
          identityRegisterPasswordUser(
              usernameRust,
              passwordRust,
              keyPayloadRust,
              keyPayloadSignatureRust,
              contentPrekeyRust,
              contentPrekeySignatureRust,
              notifPrekeyRust,
              notifPrekeySignatureRust,
              contentOneTimeKeysRust,
              notifOneTimeKeysRust,
              currentID);
        } catch (const std::exception &e) {
          error = e.what();
        };
        if (!error.empty()) {
          this->jsInvoker_->invokeAsync(
              [error, promise]() { promise->reject(error); });
        }
      });
}

jsi::Value CommRustModule::logInPasswordUser(
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
  auto usernameRust = jsiStringToRustString(username, rt);
  auto passwordRust = jsiStringToRustString(password, rt);
  auto keyPayloadRust = jsiStringToRustString(keyPayload, rt);
  auto keyPayloadSignatureRust = jsiStringToRustString(keyPayloadSignature, rt);
  auto contentPrekeyRust = jsiStringToRustString(contentPrekey, rt);
  auto contentPrekeySignatureRust =
      jsiStringToRustString(contentPrekeySignature, rt);
  auto notifPrekeyRust = jsiStringToRustString(notifPrekey, rt);
  auto notifPrekeySignatureRust =
      jsiStringToRustString(notifPrekeySignature, rt);
  auto contentOneTimeKeysRust = jsiStringArrayToRustVec(contentOneTimeKeys, rt);
  auto notifOneTimeKeysRust = jsiStringArrayToRustVec(notifOneTimeKeys, rt);

  return createPromiseAsJSIValue(
      rt, [=, this](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        std::string error;
        try {
          auto currentID = RustPromiseManager::instance.addPromise(
              {promise, this->jsInvoker_, innerRt});
          identityLogInPasswordUser(
              usernameRust,
              passwordRust,
              keyPayloadRust,
              keyPayloadSignatureRust,
              contentPrekeyRust,
              contentPrekeySignatureRust,
              notifPrekeyRust,
              notifPrekeySignatureRust,
              contentOneTimeKeysRust,
              notifOneTimeKeysRust,
              currentID);
        } catch (const std::exception &e) {
          error = e.what();
        };
        if (!error.empty()) {
          this->jsInvoker_->invokeAsync(
              [error, promise]() { promise->reject(error); });
        }
      });
}

jsi::Value CommRustModule::logInWalletUser(
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
    jsi::Array notifOneTimeKeys) {
  auto siweMessageRust = jsiStringToRustString(siweMessage, rt);
  auto siweSignatureRust = jsiStringToRustString(siweSignature, rt);
  auto keyPayloadRust = jsiStringToRustString(keyPayload, rt);
  auto keyPayloadSignatureRust = jsiStringToRustString(keyPayloadSignature, rt);
  auto contentPrekeyRust = jsiStringToRustString(contentPrekey, rt);
  auto contentPrekeySignatureRust =
      jsiStringToRustString(contentPrekeySignature, rt);
  auto notifPrekeyRust = jsiStringToRustString(notifPrekey, rt);
  auto notifPrekeySignatureRust =
      jsiStringToRustString(notifPrekeySignature, rt);
  auto contentOneTimeKeysRust = jsiStringArrayToRustVec(contentOneTimeKeys, rt);
  auto notifOneTimeKeysRust = jsiStringArrayToRustVec(notifOneTimeKeys, rt);

  return createPromiseAsJSIValue(
      rt, [=, this](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        std::string error;
        try {
          auto currentID = RustPromiseManager::instance.addPromise(
              {promise, this->jsInvoker_, innerRt});
          identityLogInWalletUser(
              siweMessageRust,
              siweSignatureRust,
              keyPayloadRust,
              keyPayloadSignatureRust,
              contentPrekeyRust,
              contentPrekeySignatureRust,
              notifPrekeyRust,
              notifPrekeySignatureRust,
              contentOneTimeKeysRust,
              notifOneTimeKeysRust,
              currentID);
        } catch (const std::exception &e) {
          error = e.what();
        };
        if (!error.empty()) {
          this->jsInvoker_->invokeAsync(
              [error, promise]() { promise->reject(error); });
        }
      });
}

jsi::Value CommRustModule::updatePassword(
    jsi::Runtime &rt,
    jsi::String userID,
    jsi::String deviceID,
    jsi::String accessToken,
    jsi::String password) {
  auto userIDRust = jsiStringToRustString(userID, rt);
  auto deviceIDRust = jsiStringToRustString(deviceID, rt);
  auto accessTokenRust = jsiStringToRustString(accessToken, rt);
  auto passwordRust = jsiStringToRustString(password, rt);

  return createPromiseAsJSIValue(
      rt, [=, this](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        std::string error;
        try {
          auto currentID = RustPromiseManager::instance.addPromise(
              {promise, this->jsInvoker_, innerRt});
          identityUpdateUserPassword(
              userIDRust,
              deviceIDRust,
              accessTokenRust,
              passwordRust,
              currentID);
        } catch (const std::exception &e) {
          error = e.what();
        };
        if (!error.empty()) {
          this->jsInvoker_->invokeAsync(
              [error, promise]() { promise->reject(error); });
        }
      });
}

jsi::Value CommRustModule::deleteUser(
    jsi::Runtime &rt,
    jsi::String userID,
    jsi::String deviceID,
    jsi::String accessToken) {
  auto userIDRust = jsiStringToRustString(userID, rt);
  auto deviceIDRust = jsiStringToRustString(deviceID, rt);
  auto accessTokenRust = jsiStringToRustString(accessToken, rt);

  return createPromiseAsJSIValue(
      rt, [=, this](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        std::string error;
        try {
          auto currentID = RustPromiseManager::instance.addPromise(
              {promise, this->jsInvoker_, innerRt});
          identityDeleteUser(
              userIDRust, deviceIDRust, accessTokenRust, currentID);
        } catch (const std::exception &e) {
          error = e.what();
        };
        if (!error.empty()) {
          this->jsInvoker_->invokeAsync(
              [error, promise]() { promise->reject(error); });
        }
      });
}

jsi::Value CommRustModule::getOutboundKeysForUser(
    jsi::Runtime &rt,
    jsi::String authUserID,
    jsi::String authDeviceID,
    jsi::String authAccessToken,
    jsi::String userID) {
  auto authUserIDRust = jsiStringToRustString(authUserID, rt);
  auto authDeviceIDRust = jsiStringToRustString(authDeviceID, rt);
  auto authAccessTokenRust = jsiStringToRustString(authAccessToken, rt);
  auto userIDRust = jsiStringToRustString(userID, rt);

  return createPromiseAsJSIValue(
      rt, [=, this](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        std::string error;
        try {
          auto currentID = RustPromiseManager::instance.addPromise(
              {promise, this->jsInvoker_, innerRt});
          identityGetOutboundKeysForUser(
              authUserIDRust,
              authDeviceIDRust,
              authAccessTokenRust,
              userIDRust,
              currentID);
        } catch (const std::exception &e) {
          error = e.what();
        };
        if (!error.empty()) {
          this->jsInvoker_->invokeAsync(
              [error, promise]() { promise->reject(error); });
        }
      });
}

jsi::Value CommRustModule::getInboundKeysForUser(
    jsi::Runtime &rt,
    jsi::String authUserID,
    jsi::String authDeviceID,
    jsi::String authAccessToken,
    jsi::String userID) {
  auto authUserIDRust = jsiStringToRustString(authUserID, rt);
  auto authDeviceIDRust = jsiStringToRustString(authDeviceID, rt);
  auto authAccessTokenRust = jsiStringToRustString(authAccessToken, rt);
  auto userIDRust = jsiStringToRustString(userID, rt);

  return createPromiseAsJSIValue(
      rt, [=, this](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        std::string error;
        try {
          auto currentID = RustPromiseManager::instance.addPromise(
              {promise, this->jsInvoker_, innerRt});
          identityGetInboundKeysForUser(
              authUserIDRust,
              authDeviceIDRust,
              authAccessTokenRust,
              userIDRust,
              currentID);
        } catch (const std::exception &e) {
          error = e.what();
        };
        if (!error.empty()) {
          this->jsInvoker_->invokeAsync(
              [error, promise]() { promise->reject(error); });
        }
      });
}

jsi::Value CommRustModule::versionSupported(jsi::Runtime &rt) {
  return createPromiseAsJSIValue(
      rt, [=, this](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        std::string error;
        try {
          auto currentID = RustPromiseManager::instance.addPromise(
              {promise, this->jsInvoker_, innerRt});
          identityVersionSupported(currentID);
        } catch (const std::exception &e) {
          error = e.what();
        };
        if (!error.empty()) {
          this->jsInvoker_->invokeAsync(
              [error, promise]() { promise->reject(error); });
        }
      });
}

jsi::Value CommRustModule::uploadOneTimeKeys(
    jsi::Runtime &rt,
    jsi::String authUserID,
    jsi::String authDeviceID,
    jsi::String authAccessToken,
    jsi::Array contentOneTimePreKeys,
    jsi::Array notifOneTimePreKeys) {
  auto authUserIDRust = jsiStringToRustString(authUserID, rt);
  auto authDeviceIDRust = jsiStringToRustString(authDeviceID, rt);
  auto authAccessTokenRust = jsiStringToRustString(authAccessToken, rt);
  auto contentOneTimePreKeysRust =
      jsiStringArrayToRustVec(contentOneTimePreKeys, rt);
  auto notifOneTimePreKeysRust =
      jsiStringArrayToRustVec(notifOneTimePreKeys, rt);

  return createPromiseAsJSIValue(
      rt, [=, this](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        std::string error;
        try {
          auto currentID = RustPromiseManager::instance.addPromise(
              {promise, this->jsInvoker_, innerRt});
          identityUploadOneTimeKeys(
              authUserIDRust,
              authDeviceIDRust,
              authAccessTokenRust,
              contentOneTimePreKeysRust,
              notifOneTimePreKeysRust,
              currentID);
        } catch (const std::exception &e) {
          error = e.what();
        };
        if (!error.empty()) {
          this->jsInvoker_->invokeAsync(
              [error, promise]() { promise->reject(error); });
        }
      });
}

jsi::Value CommRustModule::getKeyserverKeys(
    jsi::Runtime &rt,
    jsi::String authUserID,
    jsi::String authDeviceID,
    jsi::String authAccessToken,
    jsi::String keyserverID) {
  auto authUserIDRust = jsiStringToRustString(authUserID, rt);
  auto authDeviceIDRust = jsiStringToRustString(authDeviceID, rt);
  auto authAccessTokenRust = jsiStringToRustString(authAccessToken, rt);
  auto keyserverIDRust = jsiStringToRustString(keyserverID, rt);

  return createPromiseAsJSIValue(
      rt, [=, this](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        std::string error;
        try {
          auto currentID = RustPromiseManager::instance.addPromise(
              {promise, this->jsInvoker_, innerRt});
          identityGetKeyserverKeys(
              authUserIDRust,
              authDeviceIDRust,
              authAccessTokenRust,
              keyserverIDRust,
              currentID);
        } catch (const std::exception &e) {
          error = e.what();
        };
        if (!error.empty()) {
          this->jsInvoker_->invokeAsync(
              [error, promise]() { promise->reject(error); });
        }
      });
}

} // namespace comm
