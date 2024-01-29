#pragma once

#include "../_generated/rustJSI.h"

#include <ReactCommon/TurboModuleUtils.h>
#include <jsi/jsi.h>
#include <memory>

namespace comm {

namespace jsi = facebook::jsi;

class CommRustModule : public facebook::react::CommRustModuleSchemaCxxSpecJSI {
  virtual jsi::Value generateNonce(jsi::Runtime &rt) override;
  virtual jsi::Value registerUser(
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
      jsi::Array notifOneTimeKeys) override;
  virtual jsi::Value logInPasswordUser(
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
      jsi::Array notifOneTimeKeys) override;
  virtual jsi::Value logInWalletUser(
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
      jsi::String socialProof) override;
  virtual jsi::Value updatePassword(
      jsi::Runtime &rt,
      jsi::String userID,
      jsi::String deviceID,
      jsi::String accessToken,
      jsi::String password) override;
  virtual jsi::Value deleteUser(
      jsi::Runtime &rt,
      jsi::String userID,
      jsi::String deviceID,
      jsi::String accessToken) override;
  virtual jsi::Value getOutboundKeysForUser(
      jsi::Runtime &rt,
      jsi::String authUserID,
      jsi::String authDeviceID,
      jsi::String authAccessToken,
      jsi::String userID) override;
  virtual jsi::Value getInboundKeysForUser(
      jsi::Runtime &rt,
      jsi::String authUserID,
      jsi::String authDeviceID,
      jsi::String authAccessToken,
      jsi::String userID) override;
  virtual jsi::Value versionSupported(jsi::Runtime &rt) override;
  virtual jsi::Value uploadOneTimeKeys(
      jsi::Runtime &rt,
      jsi::String authUserID,
      jsi::String authDeviceID,
      jsi::String authAccessToken,
      jsi::Array contentOneTimePreKeys,
      jsi::Array notifOneTimePreKeys) override;
  virtual jsi::Value getKeyserverKeys(
      jsi::Runtime &rt,
      jsi::String authUserID,
      jsi::String authDeviceID,
      jsi::String authAccessToken,
      jsi::String keyserverID) override;
  virtual jsi::Value getDeviceListForUser(
      jsi::Runtime &rt,
      jsi::String authUserID,
      jsi::String authDeviceID,
      jsi::String authAccessToken,
      jsi::String userID,
      std::optional<double> sinceTimestamp) override;
  virtual jsi::Value updateDeviceList(
      jsi::Runtime &rt,
      jsi::String authUserID,
      jsi::String authDeviceID,
      jsi::String authAccessToken,
      jsi::String updatePayload) override;

public:
  CommRustModule(std::shared_ptr<facebook::react::CallInvoker> jsInvoker);
};

} // namespace comm
