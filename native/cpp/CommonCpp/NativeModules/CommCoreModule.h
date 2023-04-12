#pragma once

#include "../CryptoTools/CryptoModule.h"
#include "../Tools/CommSecureStore.h"
#include "../Tools/WorkerThread.h"
#include "../_generated/commJSI.h"
#include <ReactCommon/TurboModuleUtils.h>
#include <jsi/jsi.h>
#include <memory>

namespace comm {

namespace jsi = facebook::jsi;

class CommCoreModule : public facebook::react::CommCoreModuleSchemaCxxSpecJSI {
  const int codeVersion{208};
  std::unique_ptr<WorkerThread> cryptoThread;

  CommSecureStore secureStore;
  const std::string secureStoreAccountDataKey = "cryptoAccountDataKey";
  const std::string publicCryptoAccountID = "publicCryptoAccountID";
  std::unique_ptr<crypto::CryptoModule> cryptoModule;

  template <class T>
  T runSyncOrThrowJSError(jsi::Runtime &rt, std::function<T()> task);
  virtual jsi::Value getDraft(jsi::Runtime &rt, jsi::String key) override;
  virtual jsi::Value
  updateDraft(jsi::Runtime &rt, jsi::String key, jsi::String text) override;
  virtual jsi::Value
  moveDraft(jsi::Runtime &rt, jsi::String oldKey, jsi::String newKey) override;
  virtual jsi::Value getClientDBStore(jsi::Runtime &rt) override;
  virtual jsi::Value removeAllDrafts(jsi::Runtime &rt) override;
  virtual jsi::Array getAllMessagesSync(jsi::Runtime &rt) override;
  virtual jsi::Value
  processDraftStoreOperations(jsi::Runtime &rt, jsi::Array operations) override;
  virtual jsi::Value processMessageStoreOperations(
      jsi::Runtime &rt,
      jsi::Array operations) override;
  virtual void processMessageStoreOperationsSync(
      jsi::Runtime &rt,
      jsi::Array operations) override;
  virtual jsi::Array getAllThreadsSync(jsi::Runtime &rt) override;
  virtual jsi::Value processThreadStoreOperations(
      jsi::Runtime &rt,
      jsi::Array operations) override;
  virtual void processThreadStoreOperationsSync(
      jsi::Runtime &rt,
      jsi::Array operations) override;
  virtual jsi::Value initializeCryptoAccount(jsi::Runtime &rt) override;
  virtual jsi::Value getUserPublicKey(jsi::Runtime &rt) override;
  virtual jsi::Value
  getUserOneTimeKeys(jsi::Runtime &rt, double oneTimeKeysAmount) override;
  virtual jsi::Value getNotificationsOneTimeKeys(
      jsi::Runtime &rt,
      double oneTimeKeysAmount) override;
  virtual jsi::Value getNotificationsPrekey(jsi::Runtime &rt) override;
  virtual void terminate(jsi::Runtime &rt) override;
  virtual double getCodeVersion(jsi::Runtime &rt) override;
  virtual jsi::Value
  setNotifyToken(jsi::Runtime &rt, jsi::String token) override;
  virtual jsi::Value clearNotifyToken(jsi::Runtime &rt) override;
  virtual jsi::Value
  setCurrentUserID(jsi::Runtime &rt, jsi::String userID) override;
  virtual jsi::Value getCurrentUserID(jsi::Runtime &rt) override;
  virtual jsi::Value
  setDeviceID(jsi::Runtime &rt, jsi::String deviceType) override;
  virtual jsi::Value getDeviceID(jsi::Runtime &rt) override;
  virtual jsi::Value clearSensitiveData(jsi::Runtime &rt) override;
  virtual bool checkIfDatabaseNeedsDeletion(jsi::Runtime &rt) override;
  virtual void reportDBOperationsFailure(jsi::Runtime &rt) override;
  virtual jsi::Value generateNonce(jsi::Runtime &rt) override;

public:
  CommCoreModule(std::shared_ptr<facebook::react::CallInvoker> jsInvoker);
};

} // namespace comm
