#pragma once

#include "../CryptoTools/CryptoModule.h"
#include "../Tools/CommSecureStore.h"
#include "../Tools/WorkerThread.h"
#include "../_generated/NativeModules.h"
#include "../grpc/Client.h"
#include <jsi/jsi.h>
#include <memory>

namespace comm {

namespace jsi = facebook::jsi;

class CommCoreModule : public facebook::react::CommCoreModuleSchemaCxxSpecJSI {
  const int codeVersion{142};

  std::unique_ptr<WorkerThread> databaseThread;
  std::unique_ptr<WorkerThread> cryptoThread;

  CommSecureStore secureStore;
  const std::string secureStoreAccountDataKey = "cryptoAccountDataKey";
  std::unique_ptr<crypto::CryptoModule> cryptoModule;

  std::unique_ptr<network::Client> networkClient;

  jsi::Value getDraft(jsi::Runtime &rt, const jsi::String &key) override;
  jsi::Value updateDraft(jsi::Runtime &rt, const jsi::Object &draft) override;
  jsi::Value moveDraft(
      jsi::Runtime &rt,
      const jsi::String &oldKey,
      const jsi::String &newKey) override;
  jsi::Value getAllDrafts(jsi::Runtime &rt) override;
  jsi::Value removeAllDrafts(jsi::Runtime &rt) override;
  jsi::Value getAllMessages(jsi::Runtime &rt) override;
  jsi::Array getAllMessagesSync(jsi::Runtime &rt) override;
  jsi::Value processMessageStoreOperations(
      jsi::Runtime &rt,
      const jsi::Array &operations) override;
  bool processMessageStoreOperationsSync(
      jsi::Runtime &rt,
      const jsi::Array &operations) override;
  jsi::Value getAllThreads(jsi::Runtime &rt) override;
  jsi::Array getAllThreadsSync(jsi::Runtime &rt) override;
  jsi::Value processThreadStoreOperations(
      jsi::Runtime &rt,
      const jsi::Array &operations) override;
  bool processThreadStoreOperationsSync(
      jsi::Runtime &rt,
      const jsi::Array &operations) override;
  jsi::Value
  initializeCryptoAccount(jsi::Runtime &rt, const jsi::String &userId) override;
  jsi::Value getUserPublicKey(jsi::Runtime &rt) override;
  jsi::Value getUserOneTimeKeys(jsi::Runtime &rt) override;
  jsi::Object
  openSocket(jsi::Runtime &rt, const jsi::String &endpoint) override;
  double getCodeVersion(jsi::Runtime &rt) override;
  jsi::Value
  setNotifyToken(jsi::Runtime &rt, const jsi::String &token) override;
  jsi::Value clearNotifyToken(jsi::Runtime &rt) override;

public:
  CommCoreModule(std::shared_ptr<facebook::react::CallInvoker> jsInvoker);

  void initializeNetworkModule(
      const std::string &userId,
      const std::string &deviceToken,
      const std::string &hostname = "");
};

} // namespace comm
