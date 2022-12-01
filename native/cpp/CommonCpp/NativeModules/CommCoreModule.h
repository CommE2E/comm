#pragma once

#include "../CryptoTools/CryptoModule.h"
#include "../Tools/CommSecureStore.h"
#include "../Tools/WorkerThread.h"
#include "../_generated/NativeModules.h"
#include <ReactCommon/TurboModuleUtils.h>
#include <jsi/jsi.h>
#include <memory>

namespace comm {

namespace jsi = facebook::jsi;

class CommCoreModule : public facebook::react::CommCoreModuleSchemaCxxSpecJSI {
  const int codeVersion{162};
  std::unique_ptr<WorkerThread> cryptoThread;

  CommSecureStore secureStore;
  const std::string secureStoreAccountDataKey = "cryptoAccountDataKey";
  std::unique_ptr<crypto::CryptoModule> cryptoModule;

  template <class T>
  T runSyncOrThrowJSError(jsi::Runtime &rt, std::function<T()> task);
  jsi::Value getDraft(jsi::Runtime &rt, const jsi::String &key) override;
  jsi::Value updateDraft(
      jsi::Runtime &rt,
      const jsi::String &key,
      const jsi::String &text) override;
  jsi::Value moveDraft(
      jsi::Runtime &rt,
      const jsi::String &oldKey,
      const jsi::String &newKey) override;
  jsi::Value getAllDrafts(jsi::Runtime &rt) override;
  jsi::Value removeAllDrafts(jsi::Runtime &rt) override;
  jsi::Value getAllMessages(jsi::Runtime &rt) override;
  jsi::Array getAllMessagesSync(jsi::Runtime &rt) override;
  jsi::Value processDraftStoreOperations(
      jsi::Runtime &rt,
      const jsi::Array &operations) override;
  jsi::Value processMessageStoreOperations(
      jsi::Runtime &rt,
      const jsi::Array &operations) override;
  void processMessageStoreOperationsSync(
      jsi::Runtime &rt,
      const jsi::Array &operations) override;
  jsi::Value getAllThreads(jsi::Runtime &rt) override;
  jsi::Array getAllThreadsSync(jsi::Runtime &rt) override;
  jsi::Value processThreadStoreOperations(
      jsi::Runtime &rt,
      const jsi::Array &operations) override;
  void processThreadStoreOperationsSync(
      jsi::Runtime &rt,
      const jsi::Array &operations) override;
  jsi::Value
  initializeCryptoAccount(jsi::Runtime &rt, const jsi::String &userId) override;
  jsi::Value getUserPublicKey(jsi::Runtime &rt) override;
  jsi::Value getUserOneTimeKeys(jsi::Runtime &rt) override;
  double getCodeVersion(jsi::Runtime &rt) override;
  jsi::Value
  setNotifyToken(jsi::Runtime &rt, const jsi::String &token) override;
  jsi::Value clearNotifyToken(jsi::Runtime &rt) override;
  jsi::Value
  setCurrentUserID(jsi::Runtime &rt, const jsi::String &userID) override;
  jsi::Value getCurrentUserID(jsi::Runtime &rt) override;
  jsi::Value
  setDeviceID(jsi::Runtime &rt, const jsi::String &deviceType) override;
  jsi::Value getDeviceID(jsi::Runtime &rt) override;
  jsi::Value clearSensitiveData(jsi::Runtime &rt) override;

public:
  CommCoreModule(std::shared_ptr<facebook::react::CallInvoker> jsInvoker);
};

} // namespace comm
