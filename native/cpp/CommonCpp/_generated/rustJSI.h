/**
 * This code was generated by [react-native-codegen](https://www.npmjs.com/package/react-native-codegen).
 *
 * Do not edit this file as changes may cause incorrect behavior and will be lost
 * once the code is regenerated.
 *
 * @generated by codegen project: GenerateModuleH.js
 */

#pragma once

#include <ReactCommon/TurboModule.h>
#include <react/bridging/Bridging.h>

namespace facebook {
namespace react {

class JSI_EXPORT CommRustModuleSchemaCxxSpecJSI : public TurboModule {
protected:
  CommRustModuleSchemaCxxSpecJSI(std::shared_ptr<CallInvoker> jsInvoker);

public:
  virtual jsi::Value generateNonce(jsi::Runtime &rt) = 0;
  virtual jsi::Value registerPasswordUser(jsi::Runtime &rt, jsi::String username, jsi::String password, jsi::String keyPayload, jsi::String keyPayloadSignature, jsi::String contentPrekey, jsi::String contentPrekeySignature, jsi::String notifPrekey, jsi::String notifPrekeySignature, jsi::Array contentOneTimeKeys, jsi::Array notifOneTimeKeys) = 0;
  virtual jsi::Value logInPasswordUser(jsi::Runtime &rt, jsi::String username, jsi::String password, jsi::String keyPayload, jsi::String keyPayloadSignature, jsi::String contentPrekey, jsi::String contentPrekeySignature, jsi::String notifPrekey, jsi::String notifPrekeySignature, jsi::Array contentOneTimeKeys, jsi::Array notifOneTimeKeys) = 0;
  virtual jsi::Value logInWalletUser(jsi::Runtime &rt, jsi::String siweMessage, jsi::String siweSignature, jsi::String keyPayload, jsi::String keyPayloadSignature, jsi::String contentPrekey, jsi::String contentPrekeySignature, jsi::String notifPrekey, jsi::String notifPrekeySignature, jsi::Array contentOneTimeKeys, jsi::Array notifOneTimeKeys) = 0;
  virtual jsi::Value updatePassword(jsi::Runtime &rt, jsi::String userID, jsi::String deviceID, jsi::String accessToken, jsi::String password) = 0;
  virtual jsi::Value deleteUser(jsi::Runtime &rt, jsi::String userID, jsi::String deviceID, jsi::String accessToken) = 0;
  virtual jsi::Value getOutboundKeysForUser(jsi::Runtime &rt, jsi::String authUserID, jsi::String authDeviceID, jsi::String authAccessToken, jsi::String userID) = 0;
  virtual jsi::Value getInboundKeysForUser(jsi::Runtime &rt, jsi::String authUserID, jsi::String authDeviceID, jsi::String authAccessToken, jsi::String userID) = 0;
  virtual jsi::Value versionSupported(jsi::Runtime &rt) = 0;
  virtual jsi::Value uploadOneTimeKeys(jsi::Runtime &rt, jsi::String authUserID, jsi::String authDeviceID, jsi::String authAccessToken, jsi::Array contentOneTimePreKeys, jsi::Array notifOneTimePreKeys) = 0;
  virtual jsi::Value getKeyserverKeys(jsi::Runtime &rt, jsi::String authUserID, jsi::String authDeviceID, jsi::String authAccessToken, jsi::String keyserverID) = 0;

};

template <typename T>
class JSI_EXPORT CommRustModuleSchemaCxxSpec : public TurboModule {
public:
  jsi::Value get(jsi::Runtime &rt, const jsi::PropNameID &propName) override {
    return delegate_.get(rt, propName);
  }

protected:
  CommRustModuleSchemaCxxSpec(std::shared_ptr<CallInvoker> jsInvoker)
    : TurboModule("CommRustTurboModule", jsInvoker),
      delegate_(static_cast<T*>(this), jsInvoker) {}

private:
  class Delegate : public CommRustModuleSchemaCxxSpecJSI {
  public:
    Delegate(T *instance, std::shared_ptr<CallInvoker> jsInvoker) :
      CommRustModuleSchemaCxxSpecJSI(std::move(jsInvoker)), instance_(instance) {}

    jsi::Value generateNonce(jsi::Runtime &rt) override {
      static_assert(
          bridging::getParameterCount(&T::generateNonce) == 1,
          "Expected generateNonce(...) to have 1 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::generateNonce, jsInvoker_, instance_);
    }
    jsi::Value registerPasswordUser(jsi::Runtime &rt, jsi::String username, jsi::String password, jsi::String keyPayload, jsi::String keyPayloadSignature, jsi::String contentPrekey, jsi::String contentPrekeySignature, jsi::String notifPrekey, jsi::String notifPrekeySignature, jsi::Array contentOneTimeKeys, jsi::Array notifOneTimeKeys) override {
      static_assert(
          bridging::getParameterCount(&T::registerPasswordUser) == 11,
          "Expected registerPasswordUser(...) to have 11 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::registerPasswordUser, jsInvoker_, instance_, std::move(username), std::move(password), std::move(keyPayload), std::move(keyPayloadSignature), std::move(contentPrekey), std::move(contentPrekeySignature), std::move(notifPrekey), std::move(notifPrekeySignature), std::move(contentOneTimeKeys), std::move(notifOneTimeKeys));
    }
    jsi::Value logInPasswordUser(jsi::Runtime &rt, jsi::String username, jsi::String password, jsi::String keyPayload, jsi::String keyPayloadSignature, jsi::String contentPrekey, jsi::String contentPrekeySignature, jsi::String notifPrekey, jsi::String notifPrekeySignature, jsi::Array contentOneTimeKeys, jsi::Array notifOneTimeKeys) override {
      static_assert(
          bridging::getParameterCount(&T::logInPasswordUser) == 11,
          "Expected logInPasswordUser(...) to have 11 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::logInPasswordUser, jsInvoker_, instance_, std::move(username), std::move(password), std::move(keyPayload), std::move(keyPayloadSignature), std::move(contentPrekey), std::move(contentPrekeySignature), std::move(notifPrekey), std::move(notifPrekeySignature), std::move(contentOneTimeKeys), std::move(notifOneTimeKeys));
    }
    jsi::Value logInWalletUser(jsi::Runtime &rt, jsi::String siweMessage, jsi::String siweSignature, jsi::String keyPayload, jsi::String keyPayloadSignature, jsi::String contentPrekey, jsi::String contentPrekeySignature, jsi::String notifPrekey, jsi::String notifPrekeySignature, jsi::Array contentOneTimeKeys, jsi::Array notifOneTimeKeys) override {
      static_assert(
          bridging::getParameterCount(&T::logInWalletUser) == 11,
          "Expected logInWalletUser(...) to have 11 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::logInWalletUser, jsInvoker_, instance_, std::move(siweMessage), std::move(siweSignature), std::move(keyPayload), std::move(keyPayloadSignature), std::move(contentPrekey), std::move(contentPrekeySignature), std::move(notifPrekey), std::move(notifPrekeySignature), std::move(contentOneTimeKeys), std::move(notifOneTimeKeys));
    }
    jsi::Value updatePassword(jsi::Runtime &rt, jsi::String userID, jsi::String deviceID, jsi::String accessToken, jsi::String password) override {
      static_assert(
          bridging::getParameterCount(&T::updatePassword) == 5,
          "Expected updatePassword(...) to have 5 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::updatePassword, jsInvoker_, instance_, std::move(userID), std::move(deviceID), std::move(accessToken), std::move(password));
    }
    jsi::Value deleteUser(jsi::Runtime &rt, jsi::String userID, jsi::String deviceID, jsi::String accessToken) override {
      static_assert(
          bridging::getParameterCount(&T::deleteUser) == 4,
          "Expected deleteUser(...) to have 4 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::deleteUser, jsInvoker_, instance_, std::move(userID), std::move(deviceID), std::move(accessToken));
    }
    jsi::Value getOutboundKeysForUser(jsi::Runtime &rt, jsi::String authUserID, jsi::String authDeviceID, jsi::String authAccessToken, jsi::String userID) override {
      static_assert(
          bridging::getParameterCount(&T::getOutboundKeysForUser) == 5,
          "Expected getOutboundKeysForUser(...) to have 5 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::getOutboundKeysForUser, jsInvoker_, instance_, std::move(authUserID), std::move(authDeviceID), std::move(authAccessToken), std::move(userID));
    }
    jsi::Value getInboundKeysForUser(jsi::Runtime &rt, jsi::String authUserID, jsi::String authDeviceID, jsi::String authAccessToken, jsi::String userID) override {
      static_assert(
          bridging::getParameterCount(&T::getInboundKeysForUser) == 5,
          "Expected getInboundKeysForUser(...) to have 5 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::getInboundKeysForUser, jsInvoker_, instance_, std::move(authUserID), std::move(authDeviceID), std::move(authAccessToken), std::move(userID));
    }
    jsi::Value versionSupported(jsi::Runtime &rt) override {
      static_assert(
          bridging::getParameterCount(&T::versionSupported) == 1,
          "Expected versionSupported(...) to have 1 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::versionSupported, jsInvoker_, instance_);
    }
    jsi::Value uploadOneTimeKeys(jsi::Runtime &rt, jsi::String authUserID, jsi::String authDeviceID, jsi::String authAccessToken, jsi::Array contentOneTimePreKeys, jsi::Array notifOneTimePreKeys) override {
      static_assert(
          bridging::getParameterCount(&T::uploadOneTimeKeys) == 6,
          "Expected uploadOneTimeKeys(...) to have 6 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::uploadOneTimeKeys, jsInvoker_, instance_, std::move(authUserID), std::move(authDeviceID), std::move(authAccessToken), std::move(contentOneTimePreKeys), std::move(notifOneTimePreKeys));
    }
    jsi::Value getKeyserverKeys(jsi::Runtime &rt, jsi::String authUserID, jsi::String authDeviceID, jsi::String authAccessToken, jsi::String keyserverID) override {
      static_assert(
          bridging::getParameterCount(&T::getKeyserverKeys) == 5,
          "Expected getKeyserverKeys(...) to have 5 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::getKeyserverKeys, jsInvoker_, instance_, std::move(authUserID), std::move(authDeviceID), std::move(authAccessToken), std::move(keyserverID));
    }

  private:
    T *instance_;
  };

  Delegate delegate_;
};

} // namespace react
} // namespace facebook
