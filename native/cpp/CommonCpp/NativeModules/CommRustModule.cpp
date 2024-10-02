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
    jsi::Array notifOneTimeKeys,
    jsi::String farcasterID,
    jsi::String initialDeviceList) {
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
  auto farcasterIDRust = jsiStringToRustString(farcasterID, rt);
  auto initialDeviceListRust = jsiStringToRustString(initialDeviceList, rt);

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
              farcasterIDRust,
              initialDeviceListRust,
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

jsi::Value CommRustModule::registerReservedPasswordUser(
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
    jsi::Array notifOneTimeKeys,
    jsi::String keyserverMessage,
    jsi::String keyserverSignature,
    jsi::String initialDeviceList) {
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
  auto keyserverMessageRust = jsiStringToRustString(keyserverMessage, rt);
  auto keyserverSignatureRust = jsiStringToRustString(keyserverSignature, rt);
  auto initialDeviceListRust = jsiStringToRustString(initialDeviceList, rt);

  return createPromiseAsJSIValue(
      rt, [=, this](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        std::string error;
        try {
          auto currentID = RustPromiseManager::instance.addPromise(
              {promise, this->jsInvoker_, innerRt});
          identityRegisterReservedPasswordUser(
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
              keyserverMessageRust,
              keyserverSignatureRust,
              initialDeviceListRust,
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

jsi::Value CommRustModule::registerWalletUser(
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
    jsi::String farcasterID,
    jsi::String initialDeviceList) {
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
  auto farcasterIDRust = jsiStringToRustString(farcasterID, rt);
  auto initialDeviceListRust = jsiStringToRustString(initialDeviceList, rt);

  return createPromiseAsJSIValue(
      rt, [=, this](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        std::string error;
        try {
          auto currentID = RustPromiseManager::instance.addPromise(
              {promise, this->jsInvoker_, innerRt});
          identityRegisterWalletUser(
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
              farcasterIDRust,
              initialDeviceListRust,
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

jsi::Value CommRustModule::restoreUser(
    jsi::Runtime &rt,
    jsi::String userID,
    std::optional<jsi::String> siweMessage,
    std::optional<jsi::String> siweSignature,
    jsi::String keyPayload,
    jsi::String keyPayloadSignature,
    jsi::String contentPrekey,
    jsi::String contentPrekeySignature,
    jsi::String notifPrekey,
    jsi::String notifPrekeySignature,
    jsi::Array contentOneTimeKeys,
    jsi::Array notifOneTimeKeys,
    jsi::String deviceList) {
  rust::String siweMessageRust = "";
  if (siweMessage.has_value()) {
    siweMessageRust = jsiStringToRustString(siweMessage.value(), rt);
  }
  rust::String siweSignatureRust = "";
  if (siweSignature.has_value()) {
    siweSignatureRust = jsiStringToRustString(siweSignature.value(), rt);
  }
  auto userIDRust = jsiStringToRustString(userID, rt);
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
  auto deviceListRust = jsiStringToRustString(deviceList, rt);

  return createPromiseAsJSIValue(
      rt, [=, this](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        std::string error;
        try {
          auto currentID = RustPromiseManager::instance.addPromise(
              {promise, this->jsInvoker_, innerRt});
          identityRestoreUser(
              userIDRust,
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
              deviceListRust,
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
    jsi::String oldPassword,
    jsi::String newPassword) {
  auto userIDRust = jsiStringToRustString(userID, rt);
  auto deviceIDRust = jsiStringToRustString(deviceID, rt);
  auto accessTokenRust = jsiStringToRustString(accessToken, rt);
  auto oldPasswordRust = jsiStringToRustString(oldPassword, rt);
  auto newPasswordRust = jsiStringToRustString(newPassword, rt);

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
              oldPasswordRust,
              newPasswordRust,
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

jsi::Value CommRustModule::deletePasswordUser(
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
          identityDeletePasswordUser(
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

jsi::Value CommRustModule::deleteWalletUser(
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
          identityDeleteWalletUser(
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

jsi::Value CommRustModule::logOut(
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
          identityLogOut(userIDRust, deviceIDRust, accessTokenRust, currentID);
        } catch (const std::exception &e) {
          error = e.what();
        };
        if (!error.empty()) {
          this->jsInvoker_->invokeAsync(
              [error, promise]() { promise->reject(error); });
        }
      });
}

jsi::Value CommRustModule::logOutPrimaryDevice(
    jsi::Runtime &rt,
    jsi::String userID,
    jsi::String deviceID,
    jsi::String accessToken,
    jsi::String signedDeviceList) {
  auto userIDRust = jsiStringToRustString(userID, rt);
  auto deviceIDRust = jsiStringToRustString(deviceID, rt);
  auto accessTokenRust = jsiStringToRustString(accessToken, rt);
  auto deviceListRust = jsiStringToRustString(signedDeviceList, rt);

  return createPromiseAsJSIValue(
      rt, [=, this](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        std::string error;
        try {
          auto currentID = RustPromiseManager::instance.addPromise(
              {promise, this->jsInvoker_, innerRt});
          identityLogOutPrimaryDevice(
              userIDRust,
              deviceIDRust,
              accessTokenRust,
              deviceListRust,
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

jsi::Value CommRustModule::logOutSecondaryDevice(
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
          identityLogOutSecondaryDevice(
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

jsi::Value CommRustModule::getDeviceListForUser(
    jsi::Runtime &rt,
    jsi::String authUserID,
    jsi::String authDeviceID,
    jsi::String authAccessToken,
    jsi::String userID,
    std::optional<double> sinceTimestamp) {
  auto authUserIDRust = jsiStringToRustString(authUserID, rt);
  auto authDeviceIDRust = jsiStringToRustString(authDeviceID, rt);
  auto authAccessTokenRust = jsiStringToRustString(authAccessToken, rt);
  auto userIDRust = jsiStringToRustString(userID, rt);

  auto timestampI64 = static_cast<int64_t>(sinceTimestamp.value_or(0));
  return createPromiseAsJSIValue(
      rt, [=, this](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        std::string error;
        try {
          auto currentID = RustPromiseManager::instance.addPromise(
              {promise, this->jsInvoker_, innerRt});
          identityGetDeviceListForUser(
              authUserIDRust,
              authDeviceIDRust,
              authAccessTokenRust,
              userIDRust,
              timestampI64,
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

jsi::Value CommRustModule::getDeviceListsForUsers(
    jsi::Runtime &rt,
    jsi::String authUserID,
    jsi::String authDeviceID,
    jsi::String authAccessToken,
    jsi::Array userIDs) {
  auto authUserIDRust = jsiStringToRustString(authUserID, rt);
  auto authDeviceIDRust = jsiStringToRustString(authDeviceID, rt);
  auto authAccessTokenRust = jsiStringToRustString(authAccessToken, rt);
  auto userIDsRust = jsiStringArrayToRustVec(userIDs, rt);

  return createPromiseAsJSIValue(
      rt, [=, this](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        std::string error;
        try {
          auto currentID = RustPromiseManager::instance.addPromise(
              {promise, this->jsInvoker_, innerRt});
          identityGetDeviceListsForUsers(
              authUserIDRust,
              authDeviceIDRust,
              authAccessTokenRust,
              userIDsRust,
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

jsi::Value CommRustModule::updateDeviceList(
    jsi::Runtime &rt,
    jsi::String authUserID,
    jsi::String authDeviceID,
    jsi::String authAccessToken,
    jsi::String updatePayload) {
  auto authUserIDRust = jsiStringToRustString(authUserID, rt);
  auto authDeviceIDRust = jsiStringToRustString(authDeviceID, rt);
  auto authAccessTokenRust = jsiStringToRustString(authAccessToken, rt);
  auto updatePayloadRust = jsiStringToRustString(updatePayload, rt);
  return createPromiseAsJSIValue(
      rt, [=, this](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        std::string error;
        try {
          auto currentID = RustPromiseManager::instance.addPromise(
              {promise, this->jsInvoker_, innerRt});
          identityUpdateDeviceList(
              authUserIDRust,
              authDeviceIDRust,
              authAccessTokenRust,
              updatePayloadRust,
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

jsi::Value CommRustModule::syncPlatformDetails(
    jsi::Runtime &rt,
    jsi::String authUserID,
    jsi::String authDeviceID,
    jsi::String authAccessToken) {
  auto authUserIDRust = jsiStringToRustString(authUserID, rt);
  auto authDeviceIDRust = jsiStringToRustString(authDeviceID, rt);
  auto authAccessTokenRust = jsiStringToRustString(authAccessToken, rt);
  return createPromiseAsJSIValue(
      rt, [=, this](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        std::string error;
        try {
          auto currentID = RustPromiseManager::instance.addPromise(
              {promise, this->jsInvoker_, innerRt});
          identitySyncPlatformDetails(
              authUserIDRust, authDeviceIDRust, authAccessTokenRust, currentID);
        } catch (const std::exception &e) {
          error = e.what();
        };
        if (!error.empty()) {
          this->jsInvoker_->invokeAsync(
              [error, promise]() { promise->reject(error); });
        }
      });
}

jsi::Value CommRustModule::uploadSecondaryDeviceKeysAndLogIn(
    jsi::Runtime &rt,
    jsi::String userID,
    jsi::String nonce,
    jsi::String nonceSignature,
    jsi::String keyPayload,
    jsi::String keyPayloadSignature,
    jsi::String contentPrekey,
    jsi::String contentPrekeySignature,
    jsi::String notifPrekey,
    jsi::String notifPrekeySignature,
    jsi::Array contentOneTimeKeys,
    jsi::Array notifOneTimeKeys) {
  auto userIDRust = jsiStringToRustString(userID, rt);
  auto nonceRust = jsiStringToRustString(nonce, rt);
  auto nonceSignatureRust = jsiStringToRustString(nonceSignature, rt);
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
          identityUploadSecondaryDeviceKeysAndLogIn(
              userIDRust,
              nonceRust,
              nonceSignatureRust,
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

jsi::Value CommRustModule::logInExistingDevice(
    jsi::Runtime &rt,
    jsi::String userID,
    jsi::String deviceID,
    jsi::String nonce,
    jsi::String nonceSignature) {
  auto userIDRust = jsiStringToRustString(userID, rt);
  auto deviceIDRust = jsiStringToRustString(deviceID, rt);
  auto nonceRust = jsiStringToRustString(nonce, rt);
  auto nonceSignatureRust = jsiStringToRustString(nonceSignature, rt);

  return createPromiseAsJSIValue(
      rt, [=, this](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        std::string error;
        try {
          auto currentID = RustPromiseManager::instance.addPromise(
              {promise, this->jsInvoker_, innerRt});
          identityLogInExistingDevice(
              userIDRust,
              deviceIDRust,
              nonceRust,
              nonceSignatureRust,
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

jsi::Value CommRustModule::findUserIDForWalletAddress(
    jsi::Runtime &rt,
    jsi::String walletAddress) {
  auto walletAddressRust = jsiStringToRustString(walletAddress, rt);
  return createPromiseAsJSIValue(
      rt, [=, this](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        std::string error;
        try {
          auto currentID = RustPromiseManager::instance.addPromise(
              {promise, this->jsInvoker_, innerRt});
          identityFindUserIDForWalletAddress(walletAddressRust, currentID);
        } catch (const std::exception &e) {
          error = e.what();
        };
        if (!error.empty()) {
          this->jsInvoker_->invokeAsync(
              [error, promise]() { promise->reject(error); });
        }
      });
}

jsi::Value
CommRustModule::findUserIDForUsername(jsi::Runtime &rt, jsi::String username) {
  auto usernameRust = jsiStringToRustString(username, rt);
  return createPromiseAsJSIValue(
      rt, [=, this](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        std::string error;
        try {
          auto currentID = RustPromiseManager::instance.addPromise(
              {promise, this->jsInvoker_, innerRt});
          identityFindUserIDForUsername(usernameRust, currentID);
        } catch (const std::exception &e) {
          error = e.what();
        };
        if (!error.empty()) {
          this->jsInvoker_->invokeAsync(
              [error, promise]() { promise->reject(error); });
        }
      });
}

jsi::Value
CommRustModule::getFarcasterUsers(jsi::Runtime &rt, jsi::Array farcasterIDs) {
  auto farcasterIDsRust = jsiStringArrayToRustVec(farcasterIDs, rt);
  return createPromiseAsJSIValue(
      rt, [=, this](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        std::string error;
        try {
          auto currentID = RustPromiseManager::instance.addPromise(
              {promise, this->jsInvoker_, innerRt});
          identityGetFarcasterUsers(farcasterIDsRust, currentID);
        } catch (const std::exception &e) {
          error = e.what();
        };
        if (!error.empty()) {
          this->jsInvoker_->invokeAsync(
              [error, promise]() { promise->reject(error); });
        }
      });
}

jsi::Value CommRustModule::linkFarcasterAccount(
    jsi::Runtime &rt,
    jsi::String userID,
    jsi::String deviceID,
    jsi::String accessToken,
    jsi::String farcasterID) {
  auto userIDRust = jsiStringToRustString(userID, rt);
  auto deviceIDRust = jsiStringToRustString(deviceID, rt);
  auto accessTokenRust = jsiStringToRustString(accessToken, rt);
  auto farcasterIDRust = jsiStringToRustString(farcasterID, rt);
  return createPromiseAsJSIValue(
      rt, [=, this](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        std::string error;
        try {
          auto currentID = RustPromiseManager::instance.addPromise(
              {promise, this->jsInvoker_, innerRt});
          identityLinkFarcasterAccount(
              userIDRust,
              deviceIDRust,
              accessTokenRust,
              farcasterIDRust,
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

jsi::Value CommRustModule::unlinkFarcasterAccount(
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
          identityUnlinkFarcasterAccount(
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

jsi::Value CommRustModule::findUserIdentities(
    jsi::Runtime &rt,
    jsi::String authUserID,
    jsi::String authDeviceID,
    jsi::String authAccessToken,
    jsi::Array userIDs) {
  auto authUserIDRust = jsiStringToRustString(authUserID, rt);
  auto authDeviceIDRust = jsiStringToRustString(authDeviceID, rt);
  auto authAccessTokenRust = jsiStringToRustString(authAccessToken, rt);
  auto userIDsRust = jsiStringArrayToRustVec(userIDs, rt);

  return createPromiseAsJSIValue(
      rt, [=, this](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        std::string error;
        try {
          auto currentID = RustPromiseManager::instance.addPromise(
              {promise, this->jsInvoker_, innerRt});
          identityFindUserIdentities(
              authUserIDRust,
              authDeviceIDRust,
              authAccessTokenRust,
              userIDsRust,
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
