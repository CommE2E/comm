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
  virtual jsi::Value loginPasswordUser(
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
  virtual jsi::Value loginWalletUser(
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
  virtual jsi::Value getOutboundKeysForUserDevice(
      jsi::Runtime &rt,
      jsi::String identifierType,
      jsi::String identifierValue,
      jsi::String deviceID) override;

public:
  CommRustModule(std::shared_ptr<facebook::react::CallInvoker> jsInvoker);
};

} // namespace comm
