#include "CommCoreModule.h"
#include "../Notifications/BackgroundDataStorage/NotificationsCryptoModule.h"
#include "BaseDataStore.h"
#include "CommServicesAuthMetadataEmitter.h"
#include "DatabaseManager.h"
#include "InternalModules/GlobalDBSingleton.h"
#include "InternalModules/RustPromiseManager.h"
#include "NativeModuleUtils.h"
#include "TerminateApp.h"

#include <ReactCommon/TurboModuleUtils.h>
#include <folly/dynamic.h>
#include <folly/json.h>
#include <future>

#include "JSIRust.h"
#include "lib.rs.h"
#include <algorithm>
#include <string>

namespace comm {

using namespace facebook::react;

jsi::Value CommCoreModule::getDraft(jsi::Runtime &rt, jsi::String key) {
  std::string keyStr = key.utf8(rt);
  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=, &innerRt]() {
          std::string error;
          std::string draftStr;
          try {
            draftStr = DatabaseManager::getQueryExecutor().getDraft(keyStr);
          } catch (std::system_error &e) {
            error = e.what();
          }
          this->jsInvoker_->invokeAsync([=, &innerRt]() {
            if (error.size()) {
              promise->reject(error);
              return;
            }
            jsi::String draft = jsi::String::createFromUtf8(innerRt, draftStr);
            promise->resolve(std::move(draft));
          });
        };
        GlobalDBSingleton::instance.scheduleOrRunCancellable(
            job, promise, this->jsInvoker_);
      });
}

jsi::Value CommCoreModule::updateDraft(
    jsi::Runtime &rt,
    jsi::String key,
    jsi::String text) {
  std::string keyStr = key.utf8(rt);
  std::string textStr = text.utf8(rt);
  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=]() {
          std::string error;
          try {
            DatabaseManager::getQueryExecutor().updateDraft(keyStr, textStr);
          } catch (std::system_error &e) {
            error = e.what();
          }
          this->jsInvoker_->invokeAsync([=]() {
            if (error.size()) {
              promise->reject(error);
            } else {
              promise->resolve(true);
            }
          });
        };
        GlobalDBSingleton::instance.scheduleOrRunCancellable(
            job, promise, this->jsInvoker_);
      });
}

jsi::Value CommCoreModule::moveDraft(
    jsi::Runtime &rt,
    jsi::String oldKey,
    jsi::String newKey) {
  std::string oldKeyStr = oldKey.utf8(rt);
  std::string newKeyStr = newKey.utf8(rt);

  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=]() {
          std::string error;
          bool result = false;
          try {
            result = DatabaseManager::getQueryExecutor().moveDraft(
                oldKeyStr, newKeyStr);
          } catch (std::system_error &e) {
            error = e.what();
          }
          this->jsInvoker_->invokeAsync([=]() {
            if (error.size()) {
              promise->reject(error);
            } else {
              promise->resolve(result);
            }
          });
        };
        GlobalDBSingleton::instance.scheduleOrRunCancellable(
            job, promise, this->jsInvoker_);
      });
}

jsi::Value CommCoreModule::getClientDBStore(jsi::Runtime &rt) {
  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=, &innerRt]() {
          std::string error;
          std::vector<Draft> draftsVector;
          std::vector<Thread> threadsVector;
          std::vector<MessageEntity> messagesVector;
          std::vector<MessageStoreThread> messageStoreThreadsVector;
          std::vector<Report> reportStoreVector;
          std::vector<UserInfo> userStoreVector;
          std::vector<KeyserverInfo> keyserverStoreVector;
          std::vector<CommunityInfo> communityStoreVector;
          std::vector<IntegrityThreadHash> integrityStoreVector;
          std::vector<SyncedMetadataEntry> syncedMetadataStoreVector;
          std::vector<AuxUserInfo> auxUserStoreVector;
          std::vector<ThreadActivityEntry> threadActivityStoreVector;
          std::vector<EntryInfo> entryStoreVector;
          std::vector<LocalMessageInfo> messageStoreLocalMessageInfosVector;
          try {
            draftsVector = DatabaseManager::getQueryExecutor().getAllDrafts();
            messagesVector =
                DatabaseManager::getQueryExecutor().getInitialMessages();
            threadsVector = DatabaseManager::getQueryExecutor().getAllThreads();
            messageStoreThreadsVector =
                DatabaseManager::getQueryExecutor().getAllMessageStoreThreads();
            reportStoreVector =
                DatabaseManager::getQueryExecutor().getAllReports();
            userStoreVector = DatabaseManager::getQueryExecutor().getAllUsers();
            keyserverStoreVector =
                DatabaseManager::getQueryExecutor().getAllKeyservers();
            communityStoreVector =
                DatabaseManager::getQueryExecutor().getAllCommunities();
            integrityStoreVector = DatabaseManager::getQueryExecutor()
                                       .getAllIntegrityThreadHashes();
            syncedMetadataStoreVector =
                DatabaseManager::getQueryExecutor().getAllSyncedMetadata();
            auxUserStoreVector =
                DatabaseManager::getQueryExecutor().getAllAuxUserInfos();
            threadActivityStoreVector = DatabaseManager::getQueryExecutor()
                                            .getAllThreadActivityEntries();
            entryStoreVector =
                DatabaseManager::getQueryExecutor().getAllEntries();
            messageStoreLocalMessageInfosVector =
                DatabaseManager::getQueryExecutor()
                    .getAllMessageStoreLocalMessageInfos();
          } catch (std::system_error &e) {
            error = e.what();
          }
          auto draftsVectorPtr =
              std::make_shared<std::vector<Draft>>(std::move(draftsVector));
          auto messagesVectorPtr = std::make_shared<std::vector<MessageEntity>>(
              std::move(messagesVector));
          auto threadsVectorPtr =
              std::make_shared<std::vector<Thread>>(std::move(threadsVector));
          auto messageStoreThreadsVectorPtr =
              std::make_shared<std::vector<MessageStoreThread>>(
                  std::move(messageStoreThreadsVector));
          auto reportStoreVectorPtr = std::make_shared<std::vector<Report>>(
              std::move(reportStoreVector));
          auto userStoreVectorPtr = std::make_shared<std::vector<UserInfo>>(
              std::move(userStoreVector));
          auto keyserveStoreVectorPtr =
              std::make_shared<std::vector<KeyserverInfo>>(
                  std::move(keyserverStoreVector));
          auto communityStoreVectorPtr =
              std::make_shared<std::vector<CommunityInfo>>(
                  std::move(communityStoreVector));
          auto integrityStoreVectorPtr =
              std::make_shared<std::vector<IntegrityThreadHash>>(
                  std::move(integrityStoreVector));
          auto syncedMetadataStoreVectorPtr =
              std::make_shared<std::vector<SyncedMetadataEntry>>(
                  std::move(syncedMetadataStoreVector));
          auto auxUserStoreVectorPtr =
              std::make_shared<std::vector<AuxUserInfo>>(
                  std::move(auxUserStoreVector));
          auto threadActivityStoreVectorPtr =
              std::make_shared<std::vector<ThreadActivityEntry>>(
                  std::move(threadActivityStoreVector));
          auto entryStoreVectorPtr = std::make_shared<std::vector<EntryInfo>>(
              std::move(entryStoreVector));
          auto messageStoreLocalMessageInfosVectorPtr =
              std::make_shared<std::vector<LocalMessageInfo>>(
                  std::move(messageStoreLocalMessageInfosVector));
          this->jsInvoker_->invokeAsync([&innerRt,
                                         draftsVectorPtr,
                                         messagesVectorPtr,
                                         threadsVectorPtr,
                                         messageStoreThreadsVectorPtr,
                                         reportStoreVectorPtr,
                                         userStoreVectorPtr,
                                         keyserveStoreVectorPtr,
                                         communityStoreVectorPtr,
                                         integrityStoreVectorPtr,
                                         syncedMetadataStoreVectorPtr,
                                         auxUserStoreVectorPtr,
                                         threadActivityStoreVectorPtr,
                                         entryStoreVectorPtr,
                                         messageStoreLocalMessageInfosVectorPtr,
                                         error,
                                         promise,
                                         draftStore = this->draftStore,
                                         threadStore = this->threadStore,
                                         messageStore = this->messageStore,
                                         reportStore = this->reportStore,
                                         userStore = this->userStore,
                                         keyserverStore = this->keyserverStore,
                                         communityStore = this->communityStore,
                                         integrityStore = this->integrityStore,
                                         syncedMetadataStore =
                                             this->syncedMetadataStore,
                                         auxUserStore = this->auxUserStore,
                                         threadActivityStore =
                                             this->threadActivityStore,
                                         entryStore = this->entryStore]() {
            if (error.size()) {
              promise->reject(error);
              return;
            }
            jsi::Array jsiDrafts =
                draftStore.parseDBDataStore(innerRt, draftsVectorPtr);
            jsi::Array jsiMessages =
                messageStore.parseDBDataStore(innerRt, messagesVectorPtr);
            jsi::Array jsiThreads =
                threadStore.parseDBDataStore(innerRt, threadsVectorPtr);
            jsi::Array jsiMessageStoreThreads =
                messageStore.parseDBMessageStoreThreads(
                    innerRt, messageStoreThreadsVectorPtr);
            jsi::Array jsiReportStore =
                reportStore.parseDBDataStore(innerRt, reportStoreVectorPtr);
            jsi::Array jsiUserStore =
                userStore.parseDBDataStore(innerRt, userStoreVectorPtr);
            jsi::Array jsiKeyserverStore = keyserverStore.parseDBDataStore(
                innerRt, keyserveStoreVectorPtr);
            jsi::Array jsiCommunityStore = communityStore.parseDBDataStore(
                innerRt, communityStoreVectorPtr);
            jsi::Array jsiIntegrityStore = integrityStore.parseDBDataStore(
                innerRt, integrityStoreVectorPtr);
            jsi::Array jsiSyncedMetadataStore =
                syncedMetadataStore.parseDBDataStore(
                    innerRt, syncedMetadataStoreVectorPtr);
            jsi::Array jsiAuxUserStore =
                auxUserStore.parseDBDataStore(innerRt, auxUserStoreVectorPtr);
            jsi::Array jsiThreadActivityStore =
                threadActivityStore.parseDBDataStore(
                    innerRt, threadActivityStoreVectorPtr);
            jsi::Array jsiEntryStore =
                entryStore.parseDBDataStore(innerRt, entryStoreVectorPtr);
            jsi::Array jsiMessageStoreLocalMessageInfos =
                messageStore.parseDBMessageStoreLocalMessageInfos(
                    innerRt, messageStoreLocalMessageInfosVectorPtr);

            auto jsiClientDBStore = jsi::Object(innerRt);
            jsiClientDBStore.setProperty(innerRt, "messages", jsiMessages);
            jsiClientDBStore.setProperty(innerRt, "threads", jsiThreads);
            jsiClientDBStore.setProperty(innerRt, "drafts", jsiDrafts);
            jsiClientDBStore.setProperty(
                innerRt, "messageStoreThreads", jsiMessageStoreThreads);
            jsiClientDBStore.setProperty(innerRt, "reports", jsiReportStore);
            jsiClientDBStore.setProperty(innerRt, "users", jsiUserStore);
            jsiClientDBStore.setProperty(
                innerRt, "keyservers", jsiKeyserverStore);
            jsiClientDBStore.setProperty(
                innerRt, "communities", jsiCommunityStore);
            jsiClientDBStore.setProperty(
                innerRt, "integrityThreadHashes", jsiIntegrityStore);
            jsiClientDBStore.setProperty(
                innerRt, "syncedMetadata", jsiSyncedMetadataStore);
            jsiClientDBStore.setProperty(
                innerRt, "auxUserInfos", jsiAuxUserStore);
            jsiClientDBStore.setProperty(
                innerRt, "threadActivityEntries", jsiThreadActivityStore);
            jsiClientDBStore.setProperty(innerRt, "entries", jsiEntryStore);
            jsiClientDBStore.setProperty(
                innerRt,
                "messageStoreLocalMessageInfos",
                jsiMessageStoreLocalMessageInfos);

            promise->resolve(std::move(jsiClientDBStore));
          });
        };
        GlobalDBSingleton::instance.scheduleOrRunCancellable(
            job, promise, this->jsInvoker_);
      });
}

jsi::Value CommCoreModule::removeAllDrafts(jsi::Runtime &rt) {
  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=]() {
          std::string error;
          try {
            DatabaseManager::getQueryExecutor().removeAllDrafts();
          } catch (std::system_error &e) {
            error = e.what();
          }
          this->jsInvoker_->invokeAsync([=]() {
            if (error.size()) {
              promise->reject(error);
              return;
            }
            promise->resolve(jsi::Value::undefined());
          });
        };
        GlobalDBSingleton::instance.scheduleOrRunCancellable(
            job, promise, this->jsInvoker_);
      });
}

jsi::Array CommCoreModule::getInitialMessagesSync(jsi::Runtime &rt) {
  auto messagesVector =
      NativeModuleUtils::runSyncOrThrowJSError<std::vector<MessageEntity>>(
          rt, []() {
            return DatabaseManager::getQueryExecutor().getInitialMessages();
          });
  auto messagesVectorPtr =
      std::make_shared<std::vector<MessageEntity>>(std::move(messagesVector));
  jsi::Array jsiMessages =
      this->messageStore.parseDBDataStore(rt, messagesVectorPtr);
  return jsiMessages;
}

void CommCoreModule::processMessageStoreOperationsSync(
    jsi::Runtime &rt,
    jsi::Array operations) {
  return this->messageStore.processStoreOperationsSync(
      rt, std::move(operations));
}

jsi::Array CommCoreModule::getAllThreadsSync(jsi::Runtime &rt) {
  auto threadsVector =
      NativeModuleUtils::runSyncOrThrowJSError<std::vector<Thread>>(rt, []() {
        return DatabaseManager::getQueryExecutor().getAllThreads();
      });

  auto threadsVectorPtr =
      std::make_shared<std::vector<Thread>>(std::move(threadsVector));
  jsi::Array jsiThreads =
      this->threadStore.parseDBDataStore(rt, threadsVectorPtr);

  return jsiThreads;
}

void CommCoreModule::processThreadStoreOperationsSync(
    jsi::Runtime &rt,
    jsi::Array operations) {
  this->threadStore.processStoreOperationsSync(rt, std::move(operations));
}

void CommCoreModule::processReportStoreOperationsSync(
    jsi::Runtime &rt,
    jsi::Array operations) {
  this->reportStore.processStoreOperationsSync(rt, std::move(operations));
}

template <typename T>
void CommCoreModule::appendDBStoreOps(
    jsi::Runtime &rt,
    jsi::Object &operations,
    const char *key,
    T &store,
    std::shared_ptr<std::vector<std::unique_ptr<DBOperationBase>>>
        &destination) {
  auto opsObject = operations.getProperty(rt, key);
  if (opsObject.isObject()) {
    auto ops = store.createOperations(rt, opsObject.asObject(rt).asArray(rt));
    std::move(
        std::make_move_iterator(ops.begin()),
        std::make_move_iterator(ops.end()),
        std::back_inserter(*destination));
  }
}

jsi::Value CommCoreModule::processDBStoreOperations(
    jsi::Runtime &rt,
    jsi::Object operations) {
  std::string createOperationsError;

  auto storeOpsPtr =
      std::make_shared<std::vector<std::unique_ptr<DBOperationBase>>>();
  try {
    this->appendDBStoreOps(
        rt, operations, "draftStoreOperations", this->draftStore, storeOpsPtr);
    this->appendDBStoreOps(
        rt,
        operations,
        "threadStoreOperations",
        this->threadStore,
        storeOpsPtr);
    this->appendDBStoreOps(
        rt,
        operations,
        "messageStoreOperations",
        this->messageStore,
        storeOpsPtr);
    this->appendDBStoreOps(
        rt,
        operations,
        "reportStoreOperations",
        this->reportStore,
        storeOpsPtr);
    this->appendDBStoreOps(
        rt, operations, "userStoreOperations", this->userStore, storeOpsPtr);
    this->appendDBStoreOps(
        rt,
        operations,
        "keyserverStoreOperations",
        this->keyserverStore,
        storeOpsPtr);
    this->appendDBStoreOps(
        rt,
        operations,
        "communityStoreOperations",
        this->communityStore,
        storeOpsPtr);
    this->appendDBStoreOps(
        rt,
        operations,
        "integrityStoreOperations",
        this->integrityStore,
        storeOpsPtr);
    this->appendDBStoreOps(
        rt,
        operations,
        "syncedMetadataStoreOperations",
        this->syncedMetadataStore,
        storeOpsPtr);
    this->appendDBStoreOps(
        rt,
        operations,
        "auxUserStoreOperations",
        this->auxUserStore,
        storeOpsPtr);
    this->appendDBStoreOps(
        rt,
        operations,
        "threadActivityStoreOperations",
        this->threadActivityStore,
        storeOpsPtr);
    this->appendDBStoreOps(
        rt, operations, "entryStoreOperations", this->entryStore, storeOpsPtr);
    this->appendDBStoreOps(
        rt,
        operations,
        "messageSearchStoreOperations",
        this->messageSearchStore,
        storeOpsPtr);
  } catch (std::runtime_error &e) {
    createOperationsError = e.what();
  }

  std::vector<OutboundP2PMessage> messages;
  try {
    auto messagesJSIObj = operations.getProperty(rt, "outboundP2PMessages");

    if (messagesJSIObj.isObject()) {
      auto messagesJSI = messagesJSIObj.asObject(rt).asArray(rt);
      for (size_t idx = 0; idx < messagesJSI.size(rt); idx++) {
        jsi::Object msgObj = messagesJSI.getValueAtIndex(rt, idx).asObject(rt);

        std::string messageID =
            msgObj.getProperty(rt, "messageID").asString(rt).utf8(rt);
        std::string deviceID =
            msgObj.getProperty(rt, "deviceID").asString(rt).utf8(rt);
        std::string userID =
            msgObj.getProperty(rt, "userID").asString(rt).utf8(rt);
        std::string timestamp =
            msgObj.getProperty(rt, "timestamp").asString(rt).utf8(rt);
        std::string plaintext =
            msgObj.getProperty(rt, "plaintext").asString(rt).utf8(rt);
        std::string ciphertext =
            msgObj.getProperty(rt, "ciphertext").asString(rt).utf8(rt);
        std::string status =
            msgObj.getProperty(rt, "status").asString(rt).utf8(rt);
        bool supports_auto_retry =
            msgObj.getProperty(rt, "supportsAutoRetry").asBool();

        OutboundP2PMessage outboundMessage{
            messageID,
            deviceID,
            userID,
            timestamp,
            plaintext,
            ciphertext,
            status,
            supports_auto_retry};
        messages.push_back(outboundMessage);
      }
    }

  } catch (std::runtime_error &e) {
    createOperationsError = e.what();
  }

  return facebook::react::createPromiseAsJSIValue(
      rt,
      [=](jsi::Runtime &innerRt,
          std::shared_ptr<facebook::react::Promise> promise) {
        taskType job = [=]() {
          std::string error = createOperationsError;

          if (!error.size()) {
            try {
              DatabaseManager::getQueryExecutor().beginTransaction();
              for (const auto &operation : *storeOpsPtr) {
                operation->execute();
              }
              if (messages.size() > 0) {
                DatabaseManager::getQueryExecutor().addOutboundP2PMessages(
                    messages);
              }
              DatabaseManager::getQueryExecutor().commitTransaction();
            } catch (std::system_error &e) {
              error = e.what();
              DatabaseManager::getQueryExecutor().rollbackTransaction();
            }
          }

          this->jsInvoker_->invokeAsync([=]() {
            if (error.size()) {
              promise->reject(error);
            } else {
              promise->resolve(jsi::Value::undefined());
            }
          });
        };
        GlobalDBSingleton::instance.scheduleOrRunCancellable(
            job, promise, this->jsInvoker_);
      });
}

void CommCoreModule::terminate(jsi::Runtime &rt) {
  TerminateApp::terminate();
}

const std::string
getAccountDataKey(const std::string secureStoreAccountDataKey) {
  folly::Optional<std::string> storedSecretKey =
      CommSecureStore::get(secureStoreAccountDataKey);
  if (!storedSecretKey.hasValue()) {
    storedSecretKey = crypto::Tools::generateRandomString(64);
    CommSecureStore::set(secureStoreAccountDataKey, storedSecretKey.value());
  }
  return storedSecretKey.value();
}

void CommCoreModule::persistCryptoModules(
    bool persistContentModule,
    std::optional<std::pair<std::shared_ptr<crypto::CryptoModule>, std::string>>
        maybeUpdatedNotifsCryptoModule) {
  std::string storedSecretKey = getAccountDataKey(secureStoreAccountDataKey);

  if (!persistContentModule && !maybeUpdatedNotifsCryptoModule.has_value()) {
    return;
  }

  crypto::Persist newContentPersist;
  if (persistContentModule) {
    newContentPersist = this->contentCryptoModule->storeAsB64(storedSecretKey);
  }

  std::promise<void> persistencePromise;
  std::future<void> persistenceFuture = persistencePromise.get_future();
  GlobalDBSingleton::instance.scheduleOrRunCancellable(
      [=, &persistencePromise]() {
        try {
          DatabaseManager::getQueryExecutor().beginTransaction();
          if (persistContentModule) {
            DatabaseManager::getQueryExecutor().storeOlmPersistData(
                DatabaseManager::getQueryExecutor().getContentAccountID(),
                newContentPersist);
          }
          if (maybeUpdatedNotifsCryptoModule.has_value()) {
            NotificationsCryptoModule::persistNotificationsAccount(
                maybeUpdatedNotifsCryptoModule.value().first,
                maybeUpdatedNotifsCryptoModule.value().second,
                true);
          }
          DatabaseManager::getQueryExecutor().commitTransaction();
          persistencePromise.set_value();
        } catch (std::system_error &e) {
          DatabaseManager::getQueryExecutor().rollbackTransaction();
          persistencePromise.set_exception(std::make_exception_ptr(e));
        }
      });
  persistenceFuture.get();
}

jsi::Value CommCoreModule::initializeCryptoAccount(jsi::Runtime &rt) {
  folly::Optional<std::string> storedSecretKey =
      CommSecureStore::get(this->secureStoreAccountDataKey);
  if (!storedSecretKey.hasValue()) {
    storedSecretKey = crypto::Tools::generateRandomString(64);
    CommSecureStore::set(
        this->secureStoreAccountDataKey, storedSecretKey.value());
  }

  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=]() {
          crypto::Persist contentPersist;
          crypto::Persist notifsPersist;
          try {
            std::optional<std::string> contentAccountData =
                DatabaseManager::getQueryExecutor().getOlmPersistAccountData(
                    DatabaseManager::getQueryExecutor().getContentAccountID());
            if (contentAccountData.has_value()) {
              contentPersist.account = crypto::OlmBuffer(
                  contentAccountData->begin(), contentAccountData->end());
              // handle sessions data
              std::vector<OlmPersistSession> sessionsData =
                  DatabaseManager::getQueryExecutor()
                      .getOlmPersistSessionsData();
              for (OlmPersistSession &sessionsDataItem : sessionsData) {
                crypto::OlmBuffer sessionDataBuffer(
                    sessionsDataItem.session_data.begin(),
                    sessionsDataItem.session_data.end());
                crypto::SessionPersist sessionPersist{
                    sessionDataBuffer, sessionsDataItem.version};
                contentPersist.sessions.insert(std::make_pair(
                    sessionsDataItem.target_device_id, sessionPersist));
              }
            }

            std::optional<std::string> notifsAccountData =
                DatabaseManager::getQueryExecutor().getOlmPersistAccountData(
                    DatabaseManager::getQueryExecutor().getNotifsAccountID());

            if (notifsAccountData.has_value()) {
              notifsPersist.account = crypto::OlmBuffer(
                  notifsAccountData->begin(), notifsAccountData->end());
            }

          } catch (std::exception &e) {
            std::string error = e.what();
            this->jsInvoker_->invokeAsync([=]() { promise->reject(error); });
            return;
          }

          taskType cryptoJob = [=]() {
            std::string error;
            this->contentCryptoModule.reset(new crypto::CryptoModule(
                storedSecretKey.value(), contentPersist));

            std::optional<
                std::pair<std::shared_ptr<crypto::CryptoModule>, std::string>>
                maybeNotifsCryptoAccountToPersist;

            if (!NotificationsCryptoModule::
                    isNotificationsAccountInitialized()) {
              maybeNotifsCryptoAccountToPersist = {
                  std::make_shared<crypto::CryptoModule>(
                      storedSecretKey.value(), notifsPersist),
                  storedSecretKey.value()};
            }

            try {
              this->persistCryptoModules(
                  contentPersist.isEmpty(), maybeNotifsCryptoAccountToPersist);
            } catch (const std::exception &e) {
              error = e.what();
            }

            this->jsInvoker_->invokeAsync([=]() {
              if (error.size()) {
                promise->reject(error);
                return;
              }
              promise->resolve(jsi::Value::undefined());
            });
          };
          try {
            this->cryptoThread->scheduleTask(cryptoJob);
          } catch (const std::exception &e) {
            std::string error = e.what();
            this->jsInvoker_->invokeAsync([=]() { promise->reject(error); });
          }
        };
        GlobalDBSingleton::instance.scheduleOrRunCancellable(
            job, promise, this->jsInvoker_);
      });
}

jsi::Value CommCoreModule::getUserPublicKey(jsi::Runtime &rt) {
  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=, &innerRt]() {
          std::string error;
          std::string primaryKeysResult;
          std::string notificationsKeysResult;
          if (this->contentCryptoModule == nullptr ||
              !NotificationsCryptoModule::isNotificationsAccountInitialized()) {
            error = "user has not been initialized";
          } else {
            primaryKeysResult = this->contentCryptoModule->getIdentityKeys();
            notificationsKeysResult =
                NotificationsCryptoModule::getIdentityKeys();
          }

          std::string notificationsCurve25519Cpp, notificationsEd25519Cpp,
              blobPayloadCpp, signatureCpp, primaryCurve25519Cpp,
              primaryEd25519Cpp;

          if (!error.size()) {
            folly::dynamic parsedPrimary;
            try {
              parsedPrimary = folly::parseJson(primaryKeysResult);
            } catch (const folly::json::parse_error &e) {
              error =
                  "parsing identity keys failed with: " + std::string(e.what());
            }
            if (!error.size()) {
              primaryCurve25519Cpp = parsedPrimary["curve25519"].asString();
              primaryEd25519Cpp = parsedPrimary["ed25519"].asString();

              folly::dynamic parsedNotifications;
              try {
                parsedNotifications = folly::parseJson(notificationsKeysResult);
              } catch (const folly::json::parse_error &e) {
                error = "parsing notifications keys failed with: " +
                    std::string(e.what());
              }
              if (!error.size()) {
                notificationsCurve25519Cpp =
                    parsedNotifications["curve25519"].asString();
                notificationsEd25519Cpp =
                    parsedNotifications["ed25519"].asString();

                folly::dynamic blobPayloadJSON = folly::dynamic::object(
                    "primaryIdentityPublicKeys",
                    folly::dynamic::object("ed25519", primaryEd25519Cpp)(
                        "curve25519", primaryCurve25519Cpp))(
                    "notificationIdentityPublicKeys",
                    folly::dynamic::object("ed25519", notificationsEd25519Cpp)(
                        "curve25519", notificationsCurve25519Cpp));

                blobPayloadCpp = folly::toJson(blobPayloadJSON);
                signatureCpp =
                    this->contentCryptoModule->signMessage(blobPayloadCpp);
              }
            }
          }

          this->jsInvoker_->invokeAsync([=, &innerRt]() {
            if (error.size()) {
              promise->reject(error);
              return;
            }

            auto primaryCurve25519{
                jsi::String::createFromUtf8(innerRt, primaryCurve25519Cpp)};
            auto primaryEd25519{
                jsi::String::createFromUtf8(innerRt, primaryEd25519Cpp)};
            auto jsiPrimaryIdentityPublicKeys = jsi::Object(innerRt);
            jsiPrimaryIdentityPublicKeys.setProperty(
                innerRt, "ed25519", primaryEd25519);
            jsiPrimaryIdentityPublicKeys.setProperty(
                innerRt, "curve25519", primaryCurve25519);

            auto notificationsCurve25519{jsi::String::createFromUtf8(
                innerRt, notificationsCurve25519Cpp)};
            auto notificationsEd25519{
                jsi::String::createFromUtf8(innerRt, notificationsEd25519Cpp)};
            auto jsiNotificationIdentityPublicKeys = jsi::Object(innerRt);
            jsiNotificationIdentityPublicKeys.setProperty(
                innerRt, "ed25519", notificationsEd25519);
            jsiNotificationIdentityPublicKeys.setProperty(
                innerRt, "curve25519", notificationsCurve25519);

            auto blobPayload{
                jsi::String::createFromUtf8(innerRt, blobPayloadCpp)};
            auto signature{jsi::String::createFromUtf8(innerRt, signatureCpp)};

            auto jsiClientPublicKeys = jsi::Object(innerRt);
            jsiClientPublicKeys.setProperty(
                innerRt,
                "primaryIdentityPublicKeys",
                jsiPrimaryIdentityPublicKeys);
            jsiClientPublicKeys.setProperty(
                innerRt,
                "notificationIdentityPublicKeys",
                jsiNotificationIdentityPublicKeys);
            jsiClientPublicKeys.setProperty(
                innerRt, "blobPayload", blobPayload);
            jsiClientPublicKeys.setProperty(innerRt, "signature", signature);
            promise->resolve(std::move(jsiClientPublicKeys));
          });
        };
        this->cryptoThread->scheduleTask(job);
      });
}

jsi::Object parseOLMOneTimeKeys(jsi::Runtime &rt, std::string oneTimeKeysBlob) {
  folly::dynamic parsedOneTimeKeys = folly::parseJson(oneTimeKeysBlob);

  auto jsiOneTimeKeysInner = jsi::Object(rt);

  for (auto &kvPair : parsedOneTimeKeys["curve25519"].items()) {
    jsiOneTimeKeysInner.setProperty(
        rt,
        kvPair.first.asString().c_str(),
        jsi::String::createFromUtf8(rt, kvPair.second.asString()));
  }

  auto jsiOneTimeKeys = jsi::Object(rt);
  jsiOneTimeKeys.setProperty(rt, "curve25519", jsiOneTimeKeysInner);

  return jsiOneTimeKeys;
}

std::string parseOLMPrekey(std::string prekeyBlob) {
  folly::dynamic parsedPrekey;
  try {
    parsedPrekey = folly::parseJson(prekeyBlob);
  } catch (const folly::json::parse_error &e) {
    throw std::runtime_error(
        "parsing prekey failed with: " + std::string(e.what()));
  }

  folly::dynamic innerObject = parsedPrekey["curve25519"];
  if (!innerObject.isObject()) {
    throw std::runtime_error("parsing prekey failed: inner object malformed");
  }

  if (innerObject.values().begin() == innerObject.values().end()) {
    throw std::runtime_error("parsing prekey failed: prekey missing");
  }

  return parsedPrekey["curve25519"].values().begin()->asString();
}

jsi::Object parseOneTimeKeysResult(
    jsi::Runtime &rt,
    std::string contentOneTimeKeysBlob,
    std::string notifOneTimeKeysBlob) {
  auto contentOneTimeKeys = parseOLMOneTimeKeys(rt, contentOneTimeKeysBlob);
  auto notifOneTimeKeys = parseOLMOneTimeKeys(rt, notifOneTimeKeysBlob);
  auto jsiOneTimeKeysResult = jsi::Object(rt);
  jsiOneTimeKeysResult.setProperty(
      rt, "contentOneTimeKeys", contentOneTimeKeys);
  jsiOneTimeKeysResult.setProperty(
      rt, "notificationsOneTimeKeys", notifOneTimeKeys);

  return jsiOneTimeKeysResult;
}

jsi::Object parseEncryptedData(
    jsi::Runtime &rt,
    const crypto::EncryptedData &encryptedData) {
  auto encryptedDataJSI = jsi::Object(rt);
  auto message =
      std::string{encryptedData.message.begin(), encryptedData.message.end()};
  auto messageJSI = jsi::String::createFromUtf8(rt, message);
  encryptedDataJSI.setProperty(rt, "message", messageJSI);
  encryptedDataJSI.setProperty(
      rt, "messageType", static_cast<int>(encryptedData.messageType));
  if (encryptedData.sessionVersion.has_value()) {
    encryptedDataJSI.setProperty(
        rt,
        "sessionVersion",
        static_cast<int>(encryptedData.sessionVersion.value()));
  }
  return encryptedDataJSI;
}

jsi::Array parseInboundingMessages(
    jsi::Runtime &rt,
    std::shared_ptr<std::vector<InboundP2PMessage>> messagesPtr) {
  jsi::Array jsiMessages = jsi::Array(rt, messagesPtr->size());
  size_t writeIdx = 0;
  for (const InboundP2PMessage &msg : *messagesPtr) {
    jsi::Object jsiMsg = jsi::Object(rt);
    jsiMsg.setProperty(rt, "messageID", msg.message_id);
    jsiMsg.setProperty(rt, "senderDeviceID", msg.sender_device_id);
    jsiMsg.setProperty(rt, "plaintext", msg.plaintext);
    jsiMsg.setProperty(rt, "status", msg.status);
    jsiMsg.setProperty(rt, "senderUserID", msg.sender_user_id);
    jsiMessages.setValueAtIndex(rt, writeIdx++, jsiMsg);
  }
  return jsiMessages;
}

jsi::Value
CommCoreModule::getOneTimeKeys(jsi::Runtime &rt, double oneTimeKeysAmount) {
  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=, &innerRt]() {
          std::string error;
          std::string contentResult;
          std::string notifResult;
          if (this->contentCryptoModule == nullptr ||
              !NotificationsCryptoModule::isNotificationsAccountInitialized()) {
            this->jsInvoker_->invokeAsync([=, &innerRt]() {
              promise->reject("user has not been initialized");
            });
            return;
          }
          try {
            contentResult =
                this->contentCryptoModule->getOneTimeKeysForPublishing(
                    oneTimeKeysAmount);
            std::pair<std::shared_ptr<crypto::CryptoModule>, std::string>
                notifsCryptoModuleWithPicklingKey =
                    NotificationsCryptoModule::fetchNotificationsAccount()
                        .value();
            notifResult = notifsCryptoModuleWithPicklingKey.first
                              ->getOneTimeKeysForPublishing(oneTimeKeysAmount);
            this->persistCryptoModules(true, notifsCryptoModuleWithPicklingKey);
          } catch (const std::exception &e) {
            error = e.what();
          }
          this->jsInvoker_->invokeAsync([=, &innerRt]() {
            if (error.size()) {
              promise->reject(error);
              return;
            }
            promise->resolve(
                parseOneTimeKeysResult(innerRt, contentResult, notifResult));
          });
        };
        this->cryptoThread->scheduleTask(job);
      });
}

jsi::Value CommCoreModule::validateAndUploadPrekeys(
    jsi::Runtime &rt,
    jsi::String authUserID,
    jsi::String authDeviceID,
    jsi::String authAccessToken) {
  auto authUserIDRust = jsiStringToRustString(authUserID, rt);
  auto authDeviceIDRust = jsiStringToRustString(authDeviceID, rt);
  auto authAccessTokenRust = jsiStringToRustString(authAccessToken, rt);
  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=, &innerRt]() {
          std::string error;
          std::optional<std::string> maybeContentPrekeyToUpload;
          std::optional<std::string> maybeNotifsPrekeyToUpload;

          if (this->contentCryptoModule == nullptr ||
              !NotificationsCryptoModule::isNotificationsAccountInitialized()) {
            this->jsInvoker_->invokeAsync([=, &innerRt]() {
              promise->reject("user has not been initialized");
            });
            return;
          }

          std::optional<
              std::pair<std::shared_ptr<crypto::CryptoModule>, std::string>>
              notifsCryptoModuleWithPicklingKey;
          try {
            notifsCryptoModuleWithPicklingKey =
                NotificationsCryptoModule::fetchNotificationsAccount();
            maybeContentPrekeyToUpload =
                this->contentCryptoModule->validatePrekey();
            maybeNotifsPrekeyToUpload =
                notifsCryptoModuleWithPicklingKey.value()
                    .first->validatePrekey();
            this->persistCryptoModules(true, notifsCryptoModuleWithPicklingKey);

            if (!maybeContentPrekeyToUpload.has_value()) {
              maybeContentPrekeyToUpload =
                  this->contentCryptoModule->getUnpublishedPrekey();
            }
            if (!maybeNotifsPrekeyToUpload.has_value()) {
              maybeNotifsPrekeyToUpload =
                  notifsCryptoModuleWithPicklingKey.value()
                      .first->getUnpublishedPrekey();
            }
          } catch (const std::exception &e) {
            error = e.what();
          }

          if (error.size()) {
            this->jsInvoker_->invokeAsync(
                [=, &innerRt]() { promise->reject(error); });
            return;
          }

          if (!maybeContentPrekeyToUpload.has_value() &&
              !maybeNotifsPrekeyToUpload.has_value()) {
            this->jsInvoker_->invokeAsync(
                [=]() { promise->resolve(jsi::Value::undefined()); });
            return;
          }

          std::string contentPrekeyToUpload;
          if (maybeContentPrekeyToUpload.has_value()) {
            contentPrekeyToUpload = maybeContentPrekeyToUpload.value();
          } else {
            contentPrekeyToUpload = this->contentCryptoModule->getPrekey();
          }

          std::string notifsPrekeyToUpload;
          if (maybeNotifsPrekeyToUpload.has_value()) {
            notifsPrekeyToUpload = maybeNotifsPrekeyToUpload.value();
          } else {
            notifsPrekeyToUpload =
                notifsCryptoModuleWithPicklingKey.value().first->getPrekey();
          }

          std::string prekeyUploadError;

          try {
            std::string contentPrekeySignature =
                this->contentCryptoModule->getPrekeySignature();
            std::string notifsPrekeySignature =
                notifsCryptoModuleWithPicklingKey.value()
                    .first->getPrekeySignature();

            try {
              std::promise<folly::dynamic> prekeyPromise;
              std::future<folly::dynamic> prekeyFuture =
                  prekeyPromise.get_future();
              RustPromiseManager::CPPPromiseInfo promiseInfo = {
                  std::move(prekeyPromise)};
              auto currentID = RustPromiseManager::instance.addPromise(
                  std::move(promiseInfo));
              auto contentPrekeyToUploadRust =
                  rust::String(parseOLMPrekey(contentPrekeyToUpload));
              auto prekeySignatureRust = rust::string(contentPrekeySignature);
              auto notifsPrekeyToUploadRust =
                  rust::String(parseOLMPrekey(notifsPrekeyToUpload));
              auto notificationsPrekeySignatureRust =
                  rust::string(notifsPrekeySignature);
              ::identityRefreshUserPrekeys(
                  authUserIDRust,
                  authDeviceIDRust,
                  authAccessTokenRust,
                  contentPrekeyToUploadRust,
                  prekeySignatureRust,
                  notifsPrekeyToUploadRust,
                  notificationsPrekeySignatureRust,
                  currentID);
              prekeyFuture.get();
            } catch (const std::exception &e) {
              prekeyUploadError = e.what();
            }

            if (!prekeyUploadError.size()) {
              this->contentCryptoModule->markPrekeyAsPublished();
              notifsCryptoModuleWithPicklingKey.value()
                  .first->markPrekeyAsPublished();
              this->persistCryptoModules(
                  true, notifsCryptoModuleWithPicklingKey);
            }
          } catch (std::exception &e) {
            error = e.what();
          }

          this->jsInvoker_->invokeAsync([=]() {
            if (error.size()) {
              promise->reject(error);
              return;
            }
            if (prekeyUploadError.size()) {
              promise->reject(prekeyUploadError);
              return;
            }
            promise->resolve(jsi::Value::undefined());
          });
        };
        this->cryptoThread->scheduleTask(job);
      });
}

jsi::Value CommCoreModule::validateAndGetPrekeys(jsi::Runtime &rt) {
  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=, &innerRt]() {
          std::string error;
          std::string contentPrekey, notifPrekey, contentPrekeySignature,
              notifPrekeySignature;
          std::optional<std::string> contentPrekeyBlob;
          std::optional<std::string> notifPrekeyBlob;

          if (this->contentCryptoModule == nullptr ||
              !NotificationsCryptoModule::isNotificationsAccountInitialized()) {
            this->jsInvoker_->invokeAsync([=, &innerRt]() {
              promise->reject("user has not been initialized");
            });
            return;
          }

          std::optional<
              std::pair<std::shared_ptr<crypto::CryptoModule>, std::string>>
              notifsCryptoModuleWithPicklingKey;
          try {
            notifsCryptoModuleWithPicklingKey =
                NotificationsCryptoModule::fetchNotificationsAccount();
            contentPrekeyBlob = this->contentCryptoModule->validatePrekey();
            if (!contentPrekeyBlob) {
              contentPrekeyBlob =
                  this->contentCryptoModule->getUnpublishedPrekey();
            }
            if (!contentPrekeyBlob) {
              contentPrekeyBlob = this->contentCryptoModule->getPrekey();
            }

            notifPrekeyBlob = notifsCryptoModuleWithPicklingKey.value()
                                  .first->validatePrekey();
            if (!notifPrekeyBlob) {
              notifPrekeyBlob = notifsCryptoModuleWithPicklingKey.value()
                                    .first->getUnpublishedPrekey();
            }
            if (!notifPrekeyBlob) {
              notifPrekeyBlob =
                  notifsCryptoModuleWithPicklingKey.value().first->getPrekey();
            }
            this->persistCryptoModules(true, notifsCryptoModuleWithPicklingKey);

            contentPrekeySignature =
                this->contentCryptoModule->getPrekeySignature();
            notifPrekeySignature = notifsCryptoModuleWithPicklingKey.value()
                                       .first->getPrekeySignature();

            contentPrekey = parseOLMPrekey(contentPrekeyBlob.value());
            notifPrekey = parseOLMPrekey(notifPrekeyBlob.value());
          } catch (const std::exception &e) {
            error = e.what();
          }

          this->jsInvoker_->invokeAsync([=, &innerRt]() {
            if (error.size()) {
              promise->reject(error);
              return;
            }
            auto contentPrekeyJSI =
                jsi::String::createFromUtf8(innerRt, contentPrekey);
            auto contentPrekeySignatureJSI =
                jsi::String::createFromUtf8(innerRt, contentPrekeySignature);
            auto notifPrekeyJSI =
                jsi::String::createFromUtf8(innerRt, notifPrekey);
            auto notifPrekeySignatureJSI =
                jsi::String::createFromUtf8(innerRt, notifPrekeySignature);

            auto signedPrekeysJSI = jsi::Object(innerRt);
            signedPrekeysJSI.setProperty(
                innerRt, "contentPrekey", contentPrekeyJSI);
            signedPrekeysJSI.setProperty(
                innerRt, "contentPrekeySignature", contentPrekeySignatureJSI);
            signedPrekeysJSI.setProperty(
                innerRt, "notifPrekey", notifPrekeyJSI);
            signedPrekeysJSI.setProperty(
                innerRt, "notifPrekeySignature", notifPrekeySignatureJSI);

            promise->resolve(std::move(signedPrekeysJSI));
          });
        };

        this->cryptoThread->scheduleTask(job);
      });
}

jsi::Value CommCoreModule::initializeNotificationsSession(
    jsi::Runtime &rt,
    jsi::String identityKeys,
    jsi::String prekey,
    jsi::String prekeySignature,
    std::optional<jsi::String> oneTimeKey,
    jsi::String keyserverID) {
  auto identityKeysCpp{identityKeys.utf8(rt)};
  auto prekeyCpp{prekey.utf8(rt)};
  auto prekeySignatureCpp{prekeySignature.utf8(rt)};
  auto keyserverIDCpp{keyserverID.utf8(rt)};

  std::optional<std::string> oneTimeKeyCpp;
  if (oneTimeKey) {
    oneTimeKeyCpp = oneTimeKey->utf8(rt);
  }

  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=, &innerRt]() {
          std::string error;
          crypto::EncryptedData result;
          std::optional<
              std::pair<std::shared_ptr<crypto::CryptoModule>, std::string>>
              notifsCryptoModuleWithPicklingKey;
          try {
            notifsCryptoModuleWithPicklingKey =
                NotificationsCryptoModule::fetchNotificationsAccount();
            std::optional<crypto::OlmBuffer> oneTimeKeyBuffer;
            if (oneTimeKeyCpp) {
              oneTimeKeyBuffer = crypto::OlmBuffer(
                  oneTimeKeyCpp->begin(), oneTimeKeyCpp->end());
            }

            notifsCryptoModuleWithPicklingKey.value()
                .first->initializeOutboundForSendingSession(
                    keyserverIDCpp,
                    std::vector<uint8_t>(
                        identityKeysCpp.begin(), identityKeysCpp.end()),
                    std::vector<uint8_t>(prekeyCpp.begin(), prekeyCpp.end()),
                    std::vector<uint8_t>(
                        prekeySignatureCpp.begin(), prekeySignatureCpp.end()),
                    oneTimeKeyBuffer);

            result = notifsCryptoModuleWithPicklingKey.value().first->encrypt(
                keyserverIDCpp,
                NotificationsCryptoModule::initialEncryptedMessageContent);

            std::shared_ptr<crypto::Session> keyserverNotificationsSession =
                notifsCryptoModuleWithPicklingKey.value()
                    .first->getSessionByDeviceId(keyserverIDCpp);

            NotificationsCryptoModule::persistNotificationsSession(
                keyserverIDCpp, keyserverNotificationsSession);

            // Session is removed from the account since it is persisted
            // at different location that the account after serialization
            notifsCryptoModuleWithPicklingKey.value()
                .first->removeSessionByDeviceId(keyserverIDCpp);
            this->persistCryptoModules(
                false, notifsCryptoModuleWithPicklingKey);
          } catch (const std::exception &e) {
            error = e.what();
          }
          this->jsInvoker_->invokeAsync([=, &innerRt]() {
            if (error.size()) {
              promise->reject(error);
              return;
            }
            promise->resolve(jsi::String::createFromUtf8(
                innerRt,
                std::string{result.message.begin(), result.message.end()}));
          });
        };
        this->cryptoThread->scheduleTask(job);
      });
}

jsi::Value CommCoreModule::isNotificationsSessionInitialized(jsi::Runtime &rt) {
  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=, &innerRt]() {
          std::string error;
          bool result;
          try {
            result =
                NotificationsCryptoModule::isNotificationsSessionInitialized(
                    "Comm");
          } catch (const std::exception &e) {
            error = e.what();
          }
          this->jsInvoker_->invokeAsync([=, &innerRt]() {
            if (error.size()) {
              promise->reject(error);
              return;
            }
            promise->resolve(result);
          });
        };
        this->cryptoThread->scheduleTask(job);
      });
}

jsi::Value CommCoreModule::isDeviceNotificationsSessionInitialized(
    jsi::Runtime &rt,
    jsi::String deviceID) {
  auto deviceIDCpp{deviceID.utf8(rt)};
  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=, &innerRt]() {
          if (this->contentCryptoModule == nullptr ||
              !NotificationsCryptoModule::isNotificationsAccountInitialized()) {
            this->jsInvoker_->invokeAsync([=, &innerRt]() {
              promise->reject("user has not been initialized");
            });
            return;
          }

          std::string error;
          bool result;
          try {
            result = NotificationsCryptoModule::
                isDeviceNotificationsSessionInitialized(deviceIDCpp);
          } catch (const std::exception &e) {
            error = e.what();
          }

          this->jsInvoker_->invokeAsync([=, &innerRt]() {
            if (error.size()) {
              promise->reject(error);
              return;
            }
            promise->resolve(result);
          });
        };
        this->cryptoThread->scheduleTask(job);
      });
}

jsi::Value CommCoreModule::isNotificationsSessionInitializedWithDevices(
    jsi::Runtime &rt,
    jsi::Array deviceIDs) {
  std::vector<std::string> deviceIDsCpp;
  for (auto idx = 0; idx < deviceIDs.size(rt); idx++) {
    std::string deviceIDCpp =
        deviceIDs.getValueAtIndex(rt, idx).asString(rt).utf8(rt);
    deviceIDsCpp.push_back(deviceIDCpp);
  }

  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=, &innerRt]() {
          if (this->contentCryptoModule == nullptr ||
              !NotificationsCryptoModule::isNotificationsAccountInitialized()) {
            this->jsInvoker_->invokeAsync([=, &innerRt]() {
              promise->reject("user has not been initialized");
            });
            return;
          }

          std::string error;
          std::vector<std::pair<std::string, bool>> result;

          try {
            result = NotificationsCryptoModule::
                isNotificationsSessionInitializedWithDevices(deviceIDsCpp);
          } catch (const std::exception &e) {
            error = e.what();
          }

          auto resultPtr =
              std::make_shared<std::vector<std::pair<std::string, bool>>>(
                  std::move(result));

          this->jsInvoker_->invokeAsync(
              [&innerRt, resultPtr, error, promise]() {
                if (error.size()) {
                  promise->reject(error);
                  return;
                }

                jsi::Object jsiResult = jsi::Object(innerRt);
                for (const auto &deviceResult : *resultPtr) {
                  jsiResult.setProperty(
                      innerRt, deviceResult.first.c_str(), deviceResult.second);
                }
                promise->resolve(std::move(jsiResult));
              });
        };
        this->cryptoThread->scheduleTask(job);
      });
}

jsi::Value CommCoreModule::updateKeyserverDataInNotifStorage(
    jsi::Runtime &rt,
    jsi::Array keyserversData) {

  std::vector<std::pair<std::string, int>> keyserversDataCpp;
  for (auto idx = 0; idx < keyserversData.size(rt); idx++) {
    auto data = keyserversData.getValueAtIndex(rt, idx).asObject(rt);
    std::string keyserverID = data.getProperty(rt, "id").asString(rt).utf8(rt);
    std::string keyserverUnreadCountKey =
        "KEYSERVER." + keyserverID + ".UNREAD_COUNT";
    int unreadCount = data.getProperty(rt, "unreadCount").asNumber();
    keyserversDataCpp.push_back({keyserverUnreadCountKey, unreadCount});
  }

  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        std::string error;
        try {
          for (const auto &keyserverData : keyserversDataCpp) {
            CommMMKV::setInt(keyserverData.first, keyserverData.second);
          }
        } catch (const std::exception &e) {
          error = e.what();
        }

        this->jsInvoker_->invokeAsync([=, &innerRt]() {
          if (error.size()) {
            promise->reject(error);
            return;
          }
          promise->resolve(jsi::Value::undefined());
        });
      });
}

jsi::Value CommCoreModule::removeKeyserverDataFromNotifStorage(
    jsi::Runtime &rt,
    jsi::Array keyserverIDsToDelete) {
  std::vector<std::string> keyserverIDsToDeleteCpp{};
  for (auto idx = 0; idx < keyserverIDsToDelete.size(rt); idx++) {
    std::string keyserverID =
        keyserverIDsToDelete.getValueAtIndex(rt, idx).asString(rt).utf8(rt);
    std::string keyserverUnreadCountKey =
        "KEYSERVER." + keyserverID + ".UNREAD_COUNT";
    keyserverIDsToDeleteCpp.push_back(keyserverUnreadCountKey);
  }

  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        std::string error;
        try {
          CommMMKV::removeKeys(keyserverIDsToDeleteCpp);
        } catch (const std::exception &e) {
          error = e.what();
        }

        this->jsInvoker_->invokeAsync([=, &innerRt]() {
          if (error.size()) {
            promise->reject(error);
            return;
          }
          promise->resolve(jsi::Value::undefined());
        });
      });
}

jsi::Value CommCoreModule::getKeyserverDataFromNotifStorage(
    jsi::Runtime &rt,
    jsi::Array keyserverIDs) {
  std::vector<std::string> keyserverIDsCpp{};
  for (auto idx = 0; idx < keyserverIDs.size(rt); idx++) {
    std::string keyserverID =
        keyserverIDs.getValueAtIndex(rt, idx).asString(rt).utf8(rt);
    keyserverIDsCpp.push_back(keyserverID);
  }

  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        std::string error;
        std::vector<std::pair<std::string, int>> keyserversDataVector{};

        try {
          for (const auto &keyserverID : keyserverIDsCpp) {
            std::string keyserverUnreadCountKey =
                "KEYSERVER." + keyserverID + ".UNREAD_COUNT";
            std::optional<int> unreadCount =
                CommMMKV::getInt(keyserverUnreadCountKey, -1);

            if (!unreadCount.has_value()) {
              continue;
            }

            keyserversDataVector.push_back({keyserverID, unreadCount.value()});
          }
        } catch (const std::exception &e) {
          error = e.what();
        }

        auto keyserversDataVectorPtr =
            std::make_shared<std::vector<std::pair<std::string, int>>>(
                std::move(keyserversDataVector));

        this->jsInvoker_->invokeAsync(
            [&innerRt, keyserversDataVectorPtr, error, promise]() {
              if (error.size()) {
                promise->reject(error);
                return;
              }

              size_t numKeyserversData = keyserversDataVectorPtr->size();
              jsi::Array jsiKeyserversData =
                  jsi::Array(innerRt, numKeyserversData);
              size_t writeIdx = 0;

              for (const auto &keyserverData : *keyserversDataVectorPtr) {
                jsi::Object jsiKeyserverData = jsi::Object(innerRt);
                jsiKeyserverData.setProperty(
                    innerRt, "id", keyserverData.first);
                jsiKeyserverData.setProperty(
                    innerRt, "unreadCount", keyserverData.second);
                jsiKeyserversData.setValueAtIndex(
                    innerRt, writeIdx++, jsiKeyserverData);
              }

              promise->resolve(std::move(jsiKeyserversData));
            });
      });
}

jsi::Value CommCoreModule::updateUnreadThickThreadsInNotifsStorage(
    jsi::Runtime &rt,
    jsi::Array unreadThickThreadIDs) {
  std::vector<std::string> unreadThickThreadIDsCpp{};
  for (auto idx = 0; idx < unreadThickThreadIDs.size(rt); idx++) {
    std::string thickThreadID =
        unreadThickThreadIDs.getValueAtIndex(rt, idx).asString(rt).utf8(rt);
    unreadThickThreadIDsCpp.push_back(thickThreadID);
  }

  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        std::string error;
        try {
          CommMMKV::setStringSet(
              CommMMKV::notifsStorageUnreadThickThreadsKey,
              unreadThickThreadIDsCpp);
        } catch (const std::exception &e) {
          error = e.what();
        }

        this->jsInvoker_->invokeAsync([=, &innerRt]() {
          if (error.size()) {
            promise->reject(error);
            return;
          }
          promise->resolve(jsi::Value::undefined());
        });
      });
}

jsi::Value
CommCoreModule::getUnreadThickThreadIDsFromNotifsStorage(jsi::Runtime &rt) {
  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        std::string error;
        std::vector<std::string> unreadThickThreadIDs{};
        try {
          unreadThickThreadIDs = CommMMKV::getStringSet(
              CommMMKV::notifsStorageUnreadThickThreadsKey);
        } catch (const std::exception &e) {
          error = e.what();
        }

        auto unreadThreadThickThreadIDsPtr =
            std::make_shared<std::vector<std::string>>(
                std::move(unreadThickThreadIDs));

        this->jsInvoker_->invokeAsync([=, &innerRt]() {
          if (error.size()) {
            promise->reject(error);
            return;
          }

          jsi::Array jsiUnreadThickThreadIDs =
              jsi::Array(innerRt, unreadThreadThickThreadIDsPtr->size());
          size_t writeIdx = 0;

          for (const auto &thickThreadID : *unreadThreadThickThreadIDsPtr) {
            jsi::String jsiThickThreadID =
                jsi::String::createFromUtf8(innerRt, thickThreadID);
            jsiUnreadThickThreadIDs.setValueAtIndex(
                innerRt, writeIdx++, jsiThickThreadID);
          }
          promise->resolve(std::move(jsiUnreadThickThreadIDs));
        });
      });
}

jsi::Value CommCoreModule::initializeContentOutboundSession(
    jsi::Runtime &rt,
    jsi::String identityKeys,
    jsi::String prekey,
    jsi::String prekeySignature,
    std::optional<jsi::String> oneTimeKey,
    jsi::String deviceID) {
  auto identityKeysCpp{identityKeys.utf8(rt)};
  auto prekeyCpp{prekey.utf8(rt)};
  auto prekeySignatureCpp{prekeySignature.utf8(rt)};
  auto deviceIDCpp{deviceID.utf8(rt)};

  std::optional<std::string> oneTimeKeyCpp;
  if (oneTimeKey) {
    oneTimeKeyCpp = oneTimeKey->utf8(rt);
  }

  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=, &innerRt]() {
          std::string error;
          crypto::EncryptedData initialEncryptedData;
          int sessionVersion;
          try {
            std::optional<crypto::OlmBuffer> oneTimeKeyBuffer;
            if (oneTimeKeyCpp) {
              oneTimeKeyBuffer = crypto::OlmBuffer(
                  oneTimeKeyCpp->begin(), oneTimeKeyCpp->end());
            }
            sessionVersion =
                this->contentCryptoModule->initializeOutboundForSendingSession(
                    deviceIDCpp,
                    std::vector<uint8_t>(
                        identityKeysCpp.begin(), identityKeysCpp.end()),
                    std::vector<uint8_t>(prekeyCpp.begin(), prekeyCpp.end()),
                    std::vector<uint8_t>(
                        prekeySignatureCpp.begin(), prekeySignatureCpp.end()),
                    oneTimeKeyBuffer);

            const std::string initMessage = "{\"type\": \"init\"}";
            initialEncryptedData =
                contentCryptoModule->encrypt(deviceIDCpp, initMessage);

            this->persistCryptoModules(true, std::nullopt);
          } catch (const std::exception &e) {
            error = e.what();
          }
          this->jsInvoker_->invokeAsync([=, &innerRt]() {
            if (error.size()) {
              promise->reject(error);
              return;
            }
            auto initialEncryptedDataJSI =
                parseEncryptedData(innerRt, initialEncryptedData);
            auto outboundSessionCreationResultJSI = jsi::Object(innerRt);
            outboundSessionCreationResultJSI.setProperty(
                innerRt, "encryptedData", initialEncryptedDataJSI);
            outboundSessionCreationResultJSI.setProperty(
                innerRt, "sessionVersion", sessionVersion);

            promise->resolve(std::move(outboundSessionCreationResultJSI));
          });
        };
        this->cryptoThread->scheduleTask(job);
      });
}

jsi::Value CommCoreModule::initializeContentInboundSession(
    jsi::Runtime &rt,
    jsi::String identityKeys,
    jsi::Object encryptedDataJSI,
    jsi::String deviceID,
    double sessionVersion,
    bool overwrite) {
  auto identityKeysCpp{identityKeys.utf8(rt)};
  size_t messageType =
      std::lround(encryptedDataJSI.getProperty(rt, "messageType").asNumber());
  std::string encryptedMessageCpp =
      encryptedDataJSI.getProperty(rt, "message").asString(rt).utf8(rt);
  auto deviceIDCpp{deviceID.utf8(rt)};
  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=, &innerRt]() {
          std::string error;
          std::string decryptedMessage;
          try {
            this->contentCryptoModule->initializeInboundForReceivingSession(
                deviceIDCpp,
                std::vector<uint8_t>(
                    encryptedMessageCpp.begin(), encryptedMessageCpp.end()),
                std::vector<uint8_t>(
                    identityKeysCpp.begin(), identityKeysCpp.end()),
                static_cast<int>(sessionVersion),
                overwrite);
            crypto::EncryptedData encryptedData{
                std::vector<uint8_t>(
                    encryptedMessageCpp.begin(), encryptedMessageCpp.end()),
                messageType};
            decryptedMessage =
                this->contentCryptoModule->decrypt(deviceIDCpp, encryptedData);
            this->persistCryptoModules(true, std::nullopt);
          } catch (const std::exception &e) {
            error = e.what();
          }
          this->jsInvoker_->invokeAsync([=, &innerRt]() {
            if (error.size()) {
              promise->reject(error);
              return;
            }
            promise->resolve(
                jsi::String::createFromUtf8(innerRt, decryptedMessage));
          });
        };
        this->cryptoThread->scheduleTask(job);
      });
}

jsi::Value CommCoreModule::isContentSessionInitialized(
    jsi::Runtime &rt,
    jsi::String deviceID) {
  auto deviceIDCpp{deviceID.utf8(rt)};
  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=, &innerRt]() {
          std::string error;
          bool result;

          if (this->contentCryptoModule == nullptr ||
              !NotificationsCryptoModule::isNotificationsAccountInitialized()) {
            this->jsInvoker_->invokeAsync([=, &innerRt]() {
              promise->reject("user has not been initialized");
            });
            return;
          }

          try {
            result = this->contentCryptoModule->hasSessionFor(deviceIDCpp);
          } catch (const std::exception &e) {
            error = e.what();
          }

          this->jsInvoker_->invokeAsync([=, &innerRt]() {
            if (error.size()) {
              promise->reject(error);
              return;
            }
            promise->resolve(result);
          });
        };
        this->cryptoThread->scheduleTask(job);
      });
}

jsi::Value CommCoreModule::initializeNotificationsOutboundSession(
    jsi::Runtime &rt,
    jsi::String identityKeys,
    jsi::String prekey,
    jsi::String prekeySignature,
    std::optional<jsi::String> oneTimeKey,
    jsi::String deviceID) {
  auto identityKeysCpp{identityKeys.utf8(rt)};
  auto prekeyCpp{prekey.utf8(rt)};
  auto prekeySignatureCpp{prekeySignature.utf8(rt)};
  auto deviceIDCpp{deviceID.utf8(rt)};

  std::optional<std::string> oneTimeKeyCpp;
  if (oneTimeKey) {
    oneTimeKeyCpp = oneTimeKey->utf8(rt);
  }

  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=, &innerRt]() {
          std::string error;
          crypto::EncryptedData result;
          std::optional<
              std::pair<std::shared_ptr<crypto::CryptoModule>, std::string>>
              notifsCryptoModuleWithPicklingKey;
          try {
            notifsCryptoModuleWithPicklingKey =
                NotificationsCryptoModule::fetchNotificationsAccount();
            std::optional<crypto::OlmBuffer> oneTimeKeyBuffer;
            if (oneTimeKeyCpp) {
              oneTimeKeyBuffer = crypto::OlmBuffer(
                  oneTimeKeyCpp->begin(), oneTimeKeyCpp->end());
            }
            notifsCryptoModuleWithPicklingKey.value()
                .first->initializeOutboundForSendingSession(
                    deviceIDCpp,
                    std::vector<uint8_t>(
                        identityKeysCpp.begin(), identityKeysCpp.end()),
                    std::vector<uint8_t>(prekeyCpp.begin(), prekeyCpp.end()),
                    std::vector<uint8_t>(
                        prekeySignatureCpp.begin(), prekeySignatureCpp.end()),
                    oneTimeKeyBuffer);

            result = notifsCryptoModuleWithPicklingKey.value().first->encrypt(
                deviceIDCpp,
                NotificationsCryptoModule::initialEncryptedMessageContent);

            std::shared_ptr<crypto::Session> peerNotificationsSession =
                notifsCryptoModuleWithPicklingKey.value()
                    .first->getSessionByDeviceId(deviceIDCpp);

            NotificationsCryptoModule::persistDeviceNotificationsSession(
                deviceIDCpp, peerNotificationsSession);

            // Session is removed from the account since it is persisted
            // at different location that the account after serialization
            notifsCryptoModuleWithPicklingKey.value()
                .first->removeSessionByDeviceId(deviceIDCpp);
            this->persistCryptoModules(
                false, notifsCryptoModuleWithPicklingKey);
          } catch (const std::exception &e) {
            error = e.what();
          }
          this->jsInvoker_->invokeAsync([=, &innerRt]() {
            if (error.size()) {
              promise->reject(error);
              return;
            }
            auto initialEncryptedDataJSI = parseEncryptedData(innerRt, result);
            promise->resolve(std::move(initialEncryptedDataJSI));
          });
        };
        this->cryptoThread->scheduleTask(job);
      });
}

jsi::Value CommCoreModule::encrypt(
    jsi::Runtime &rt,
    jsi::String message,
    jsi::String deviceID) {
  auto messageCpp{message.utf8(rt)};
  auto deviceIDCpp{deviceID.utf8(rt)};
  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=, &innerRt]() {
          std::string error;
          crypto::EncryptedData encryptedMessage;
          try {
            encryptedMessage =
                contentCryptoModule->encrypt(deviceIDCpp, messageCpp);
            this->persistCryptoModules(true, std::nullopt);
          } catch (const std::exception &e) {
            error = e.what();
          }
          this->jsInvoker_->invokeAsync([=, &innerRt]() {
            if (error.size()) {
              promise->reject(error);
              return;
            }
            auto encryptedDataJSI =
                parseEncryptedData(innerRt, encryptedMessage);
            promise->resolve(std::move(encryptedDataJSI));
          });
        };
        this->cryptoThread->scheduleTask(job);
      });
}

jsi::Value CommCoreModule::encryptNotification(
    jsi::Runtime &rt,
    jsi::String payload,
    jsi::String deviceID) {
  auto payloadCpp{payload.utf8(rt)};
  auto deviceIDCpp{deviceID.utf8(rt)};

  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=, &innerRt]() {
          std::string error;
          crypto::EncryptedData result;
          try {
            result =
                NotificationsCryptoModule::encrypt(deviceIDCpp, payloadCpp);
          } catch (const std::exception &e) {
            error = e.what();
          }

          this->jsInvoker_->invokeAsync([=, &innerRt]() {
            if (error.size()) {
              promise->reject(error);
              return;
            }
            auto encryptedDataJSI = parseEncryptedData(innerRt, result);
            promise->resolve(std::move(encryptedDataJSI));
          });
        };
        this->cryptoThread->scheduleTask(job);
      });
}

jsi::Value CommCoreModule::encryptAndPersist(
    jsi::Runtime &rt,
    jsi::String message,
    jsi::String deviceID,
    jsi::String messageID) {
  auto messageCpp{message.utf8(rt)};
  auto deviceIDCpp{deviceID.utf8(rt)};
  auto messageIDCpp{messageID.utf8(rt)};
  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=, &innerRt]() {
          std::string error;
          crypto::EncryptedData encryptedMessage;
          try {
            encryptedMessage =
                contentCryptoModule->encrypt(deviceIDCpp, messageCpp);

            std::string storedSecretKey =
                getAccountDataKey(secureStoreAccountDataKey);
            crypto::Persist newContentPersist =
                this->contentCryptoModule->storeAsB64(storedSecretKey);

            std::promise<void> persistencePromise;
            std::future<void> persistenceFuture =
                persistencePromise.get_future();
            GlobalDBSingleton::instance.scheduleOrRunCancellable(
                [=, &persistencePromise]() {
                  try {

                    folly::dynamic jsonObject = folly::dynamic::object;
                    std::string messageStr(
                        encryptedMessage.message.begin(),
                        encryptedMessage.message.end());
                    jsonObject["message"] = messageStr;
                    jsonObject["messageType"] = encryptedMessage.messageType;
                    std::string ciphertext = folly::toJson(jsonObject);

                    DatabaseManager::getQueryExecutor().beginTransaction();
                    DatabaseManager::getQueryExecutor()
                        .setCiphertextForOutboundP2PMessage(
                            messageIDCpp, deviceIDCpp, ciphertext);
                    DatabaseManager::getQueryExecutor().storeOlmPersistData(
                        DatabaseManager::getQueryExecutor()
                            .getContentAccountID(),
                        newContentPersist);
                    DatabaseManager::getQueryExecutor().commitTransaction();
                    persistencePromise.set_value();
                  } catch (std::system_error &e) {
                    DatabaseManager::getQueryExecutor().rollbackTransaction();
                    persistencePromise.set_exception(
                        std::make_exception_ptr(e));
                  }
                });
            persistenceFuture.get();

          } catch (const std::exception &e) {
            error = e.what();
          }
          this->jsInvoker_->invokeAsync([=, &innerRt]() {
            if (error.size()) {
              promise->reject(error);
              return;
            }
            auto encryptedDataJSI =
                parseEncryptedData(innerRt, encryptedMessage);
            promise->resolve(std::move(encryptedDataJSI));
          });
        };
        this->cryptoThread->scheduleTask(job);
      });
}

jsi::Value CommCoreModule::decrypt(
    jsi::Runtime &rt,
    jsi::Object encryptedDataJSI,
    jsi::String deviceID) {
  size_t messageType =
      std::lround(encryptedDataJSI.getProperty(rt, "messageType").asNumber());
  std::string message =
      encryptedDataJSI.getProperty(rt, "message").asString(rt).utf8(rt);
  auto deviceIDCpp{deviceID.utf8(rt)};

  std::optional<int> sessionVersion;
  if (encryptedDataJSI.hasProperty(rt, "sessionVersion")) {
    sessionVersion = std::lround(
        encryptedDataJSI.getProperty(rt, "sessionVersion").asNumber());
  }

  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=, &innerRt]() {
          std::string error;
          std::string decryptedMessage;
          try {
            crypto::EncryptedData encryptedData{
                std::vector<uint8_t>(message.begin(), message.end()),
                messageType,
                sessionVersion};
            decryptedMessage =
                this->contentCryptoModule->decrypt(deviceIDCpp, encryptedData);
            this->persistCryptoModules(true, std::nullopt);
          } catch (const std::exception &e) {
            error = e.what();
          }
          this->jsInvoker_->invokeAsync([=, &innerRt]() {
            if (error.size()) {
              promise->reject(error);
              return;
            }
            promise->resolve(
                jsi::String::createFromUtf8(innerRt, decryptedMessage));
          });
        };
        this->cryptoThread->scheduleTask(job);
      });
}

jsi::Value CommCoreModule::decryptAndPersist(
    jsi::Runtime &rt,
    jsi::Object encryptedDataJSI,
    jsi::String deviceID,
    jsi::String userID,
    jsi::String messageID) {
  size_t messageType =
      std::lround(encryptedDataJSI.getProperty(rt, "messageType").asNumber());
  std::string message =
      encryptedDataJSI.getProperty(rt, "message").asString(rt).utf8(rt);

  std::optional<int> sessionVersion;
  if (encryptedDataJSI.hasProperty(rt, "sessionVersion")) {
    sessionVersion = std::lround(
        encryptedDataJSI.getProperty(rt, "sessionVersion").asNumber());
  }

  auto deviceIDCpp{deviceID.utf8(rt)};
  auto messageIDCpp{messageID.utf8(rt)};
  auto userIDCpp{userID.utf8(rt)};
  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=, &innerRt]() {
          std::string error;
          std::string decryptedMessage;
          try {
            crypto::EncryptedData encryptedData{
                std::vector<uint8_t>(message.begin(), message.end()),
                messageType,
                sessionVersion};
            decryptedMessage =
                this->contentCryptoModule->decrypt(deviceIDCpp, encryptedData);

            std::string storedSecretKey =
                getAccountDataKey(secureStoreAccountDataKey);
            crypto::Persist newContentPersist =
                this->contentCryptoModule->storeAsB64(storedSecretKey);

            std::promise<void> persistencePromise;
            std::future<void> persistenceFuture =
                persistencePromise.get_future();
            GlobalDBSingleton::instance.scheduleOrRunCancellable(
                [=, &persistencePromise]() {
                  try {
                    InboundP2PMessage message{
                        messageIDCpp,
                        deviceIDCpp,
                        decryptedMessage,
                        "decrypted",
                        userIDCpp};

                    DatabaseManager::getQueryExecutor().beginTransaction();
                    DatabaseManager::getQueryExecutor().addInboundP2PMessage(
                        message);
                    DatabaseManager::getQueryExecutor().storeOlmPersistData(
                        DatabaseManager::getQueryExecutor()
                            .getContentAccountID(),
                        newContentPersist);
                    DatabaseManager::getQueryExecutor().commitTransaction();
                    persistencePromise.set_value();
                  } catch (std::system_error &e) {
                    DatabaseManager::getQueryExecutor().rollbackTransaction();
                    persistencePromise.set_exception(
                        std::make_exception_ptr(e));
                  }
                });
            persistenceFuture.get();
          } catch (const std::exception &e) {
            error = e.what();
          }
          this->jsInvoker_->invokeAsync([=, &innerRt]() {
            if (error.size()) {
              promise->reject(error);
              return;
            }
            promise->resolve(
                jsi::String::createFromUtf8(innerRt, decryptedMessage));
          });
        };
        this->cryptoThread->scheduleTask(job);
      });
}

jsi::Value CommCoreModule::signMessage(jsi::Runtime &rt, jsi::String message) {
  std::string messageStr = message.utf8(rt);
  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=, &innerRt]() {
          std::string error;
          std::string signature;
          try {
            signature = this->contentCryptoModule->signMessage(messageStr);
          } catch (const std::exception &e) {
            error = "signing message failed with: " + std::string(e.what());
          }

          this->jsInvoker_->invokeAsync([=, &innerRt]() {
            if (error.size()) {
              promise->reject(error);
              return;
            }

            auto jsiSignature{jsi::String::createFromUtf8(innerRt, signature)};
            promise->resolve(std::move(jsiSignature));
          });
        };
        this->cryptoThread->scheduleTask(job);
      });
}

jsi::Value CommCoreModule::signMessageUsingAccount(
    jsi::Runtime &rt,
    jsi::String message,
    jsi::String pickledAccount,
    jsi::String pickleKey) {
  std::string messageStr = message.utf8(rt);
  std::string pickledAccountStr = pickledAccount.utf8(rt);
  std::string pickleKeyStr = pickleKey.utf8(rt);
  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=, &innerRt]() {
          std::string error;
          std::string signature;
          try {
            crypto::Persist persist;
            persist.account = crypto::OlmBuffer(
                pickledAccountStr.begin(), pickledAccountStr.end());
            auto cryptoModule = new crypto::CryptoModule(pickleKeyStr, persist);
            signature = cryptoModule->signMessage(messageStr);
          } catch (const std::exception &e) {
            error = "signing message failed with: " + std::string(e.what());
          }

          this->jsInvoker_->invokeAsync([=, &innerRt]() {
            if (error.size()) {
              promise->reject(error);
              return;
            }

            auto jsiSignature{jsi::String::createFromUtf8(innerRt, signature)};
            promise->resolve(std::move(jsiSignature));
          });
        };
        this->cryptoThread->scheduleTask(job);
      });
}

jsi::Value CommCoreModule::verifySignature(
    jsi::Runtime &rt,
    jsi::String publicKey,
    jsi::String message,
    jsi::String signature) {
  std::string keyStr = publicKey.utf8(rt);
  std::string messageStr = message.utf8(rt);
  std::string signatureStr = signature.utf8(rt);
  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=, &innerRt]() {
          std::string error;
          try {
            crypto::CryptoModule::verifySignature(
                keyStr, messageStr, signatureStr);
          } catch (const std::exception &e) {
            error = "verifying signature failed with: " + std::string(e.what());
          }

          this->jsInvoker_->invokeAsync([=, &innerRt]() {
            if (error.size()) {
              promise->reject(error);
              return;
            }
            promise->resolve(jsi::Value::undefined());
          });
        };
        this->cryptoThread->scheduleTask(job);
      });
}

CommCoreModule::CommCoreModule(
    std::shared_ptr<facebook::react::CallInvoker> jsInvoker)
    : facebook::react::CommCoreModuleSchemaCxxSpecJSI(jsInvoker),
      cryptoThread(std::make_unique<WorkerThread>("crypto")),
      draftStore(jsInvoker),
      threadStore(jsInvoker),
      messageStore(jsInvoker),
      reportStore(jsInvoker),
      userStore(jsInvoker),
      keyserverStore(jsInvoker),
      communityStore(jsInvoker),
      integrityStore(jsInvoker),
      syncedMetadataStore(jsInvoker),
      auxUserStore(jsInvoker),
      threadActivityStore(jsInvoker),
      entryStore(jsInvoker),
      messageSearchStore(jsInvoker) {
  GlobalDBSingleton::instance.enableMultithreading();
}

double CommCoreModule::getCodeVersion(jsi::Runtime &rt) {
  return this->codeVersion;
}

jsi::Value CommCoreModule::setNotifyToken(jsi::Runtime &rt, jsi::String token) {
  auto notifyToken{token.utf8(rt)};
  return createPromiseAsJSIValue(
      rt,
      [this,
       notifyToken](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [this, notifyToken, promise]() {
          std::string error;
          try {
            DatabaseManager::getQueryExecutor().setNotifyToken(notifyToken);
          } catch (std::system_error &e) {
            error = e.what();
          }

          this->jsInvoker_->invokeAsync([error, promise]() {
            if (error.size()) {
              promise->reject(error);
            } else {
              promise->resolve(jsi::Value::undefined());
            }
          });
        };
        GlobalDBSingleton::instance.scheduleOrRunCancellable(
            job, promise, this->jsInvoker_);
      });
}

jsi::Value CommCoreModule::clearNotifyToken(jsi::Runtime &rt) {
  return createPromiseAsJSIValue(
      rt, [this](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [this, promise]() {
          std::string error;
          try {
            DatabaseManager::getQueryExecutor().clearNotifyToken();
          } catch (std::system_error &e) {
            error = e.what();
          }
          this->jsInvoker_->invokeAsync([error, promise]() {
            if (error.size()) {
              promise->reject(error);
            } else {
              promise->resolve(jsi::Value::undefined());
            }
          });
        };
        GlobalDBSingleton::instance.scheduleOrRunCancellable(
            job, promise, this->jsInvoker_);
      });
};

jsi::Value
CommCoreModule::stampSQLiteDBUserID(jsi::Runtime &rt, jsi::String userID) {
  auto currentUserID{userID.utf8(rt)};
  return createPromiseAsJSIValue(
      rt,
      [this,
       currentUserID](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [this, promise, currentUserID]() {
          std::string error;
          try {
            DatabaseManager::getQueryExecutor().stampSQLiteDBUserID(
                currentUserID);
          } catch (const std::exception &e) {
            error = e.what();
          }
          this->jsInvoker_->invokeAsync([error, promise]() {
            if (error.size()) {
              promise->reject(error);
            } else {
              promise->resolve(jsi::Value::undefined());
            }
          });
        };
        GlobalDBSingleton::instance.scheduleOrRunCancellable(
            job, promise, this->jsInvoker_);
      });
}

jsi::Value CommCoreModule::getSQLiteStampedUserID(jsi::Runtime &rt) {
  return createPromiseAsJSIValue(
      rt, [this](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [this, &innerRt, promise]() {
          std::string error;
          std::string result;
          try {
            result =
                DatabaseManager::getQueryExecutor().getSQLiteStampedUserID();
          } catch (const std::exception &e) {
            error = e.what();
          }
          this->jsInvoker_->invokeAsync([&innerRt, error, result, promise]() {
            if (error.size()) {
              promise->reject(error);
            } else {
              promise->resolve(jsi::String::createFromUtf8(innerRt, result));
            }
          });
        };
        GlobalDBSingleton::instance.scheduleOrRunCancellable(
            job, promise, this->jsInvoker_);
      });
}

jsi::Value CommCoreModule::clearSensitiveData(jsi::Runtime &rt) {
  return createPromiseAsJSIValue(
      rt, [this](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        GlobalDBSingleton::instance.setTasksCancelled(true);
        taskType job = [this, promise]() {
          std::string error;
          try {
            this->innerClearCommServicesAuthMetadata();
            DatabaseManager::clearSensitiveData();
          } catch (const std::exception &e) {
            error = e.what();
          }
          this->jsInvoker_->invokeAsync([error, promise]() {
            if (error.size()) {
              promise->reject(error);
            } else {
              promise->resolve(jsi::Value::undefined());
            }
          });
          GlobalDBSingleton::instance.scheduleOrRun(
              []() { GlobalDBSingleton::instance.setTasksCancelled(false); });
        };
        GlobalDBSingleton::instance.scheduleOrRun(job);
      });
}

bool CommCoreModule::checkIfDatabaseNeedsDeletion(jsi::Runtime &rt) {
  return DatabaseManager::checkIfDatabaseNeedsDeletion();
}

void CommCoreModule::reportDBOperationsFailure(jsi::Runtime &rt) {
  DatabaseManager::reportDBOperationsFailure();
}

jsi::Value CommCoreModule::generateRandomString(jsi::Runtime &rt, double size) {
  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=, &innerRt]() {
          std::string error;
          std::string randomString;
          try {
            randomString =
                crypto::Tools::generateRandomString(static_cast<size_t>(size));
          } catch (const std::exception &e) {
            error = "Failed to generate random string for size " +
                std::to_string(size) + ": " + e.what();
          }

          this->jsInvoker_->invokeAsync(
              [&innerRt, error, randomString, promise]() {
                if (error.size()) {
                  promise->reject(error);
                } else {
                  jsi::String jsiRandomString =
                      jsi::String::createFromUtf8(innerRt, randomString);
                  promise->resolve(std::move(jsiRandomString));
                }
              });
        };
        this->cryptoThread->scheduleTask(job);
      });
}

jsi::Value CommCoreModule::setCommServicesAuthMetadata(
    jsi::Runtime &rt,
    jsi::String userID,
    jsi::String deviceID,
    jsi::String accessToken) {
  auto userIDStr{userID.utf8(rt)};
  auto deviceIDStr{deviceID.utf8(rt)};
  auto accessTokenStr{accessToken.utf8(rt)};
  return createPromiseAsJSIValue(
      rt,
      [this, userIDStr, deviceIDStr, accessTokenStr](
          jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        std::string error;
        try {
          this->innerSetCommServicesAuthMetadata(
              userIDStr, deviceIDStr, accessTokenStr);
        } catch (const std::exception &e) {
          error = e.what();
        }
        this->jsInvoker_->invokeAsync([error, promise]() {
          if (error.size()) {
            promise->reject(error);
          } else {
            promise->resolve(jsi::Value::undefined());
          }
        });
      });
}

void CommCoreModule::innerSetCommServicesAuthMetadata(
    std::string userID,
    std::string deviceID,
    std::string accessToken) {
  CommSecureStore::set(CommSecureStore::userID, userID);
  CommSecureStore::set(CommSecureStore::deviceID, deviceID);
  CommSecureStore::set(CommSecureStore::commServicesAccessToken, accessToken);
  CommServicesAuthMetadataEmitter::sendAuthMetadataToJS(accessToken, userID);
}

jsi::Value CommCoreModule::getCommServicesAuthMetadata(jsi::Runtime &rt) {
  return createPromiseAsJSIValue(
      rt, [this](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        std::string error;
        std::string userID;
        std::string deviceID;
        std::string accessToken;
        try {
          folly::Optional<std::string> userIDOpt =
              CommSecureStore::get(CommSecureStore::userID);
          if (userIDOpt.hasValue()) {
            userID = userIDOpt.value();
          }
          folly::Optional<std::string> deviceIDOpt =
              CommSecureStore::get(CommSecureStore::deviceID);
          if (deviceIDOpt.hasValue()) {
            deviceID = deviceIDOpt.value();
          }
          folly::Optional<std::string> accessTokenOpt =
              CommSecureStore::get(CommSecureStore::commServicesAccessToken);
          if (accessTokenOpt.hasValue()) {
            accessToken = accessTokenOpt.value();
          }
        } catch (const std::exception &e) {
          error = e.what();
        }
        this->jsInvoker_->invokeAsync(
            [&innerRt, error, userID, deviceID, accessToken, promise]() {
              if (error.size()) {
                promise->reject(error);
              } else {
                auto authMetadata = jsi::Object(innerRt);
                if (!userID.empty()) {
                  authMetadata.setProperty(
                      innerRt,
                      "userID",
                      jsi::String::createFromUtf8(innerRt, userID));
                }
                if (!deviceID.empty()) {
                  authMetadata.setProperty(
                      innerRt,
                      "deviceID",
                      jsi::String::createFromUtf8(innerRt, deviceID));
                }
                if (!accessToken.empty()) {
                  authMetadata.setProperty(
                      innerRt,
                      "accessToken",
                      jsi::String::createFromUtf8(innerRt, accessToken));
                }
                promise->resolve(std::move(authMetadata));
              }
            });
      });
}

jsi::Value CommCoreModule::clearCommServicesAuthMetadata(jsi::Runtime &rt) {
  return this->setCommServicesAuthMetadata(
      rt,
      jsi::String::createFromUtf8(rt, ""),
      jsi::String::createFromUtf8(rt, ""),
      jsi::String::createFromUtf8(rt, ""));
}

void CommCoreModule::innerClearCommServicesAuthMetadata() {
  return this->innerSetCommServicesAuthMetadata("", "", "");
}

jsi::Value CommCoreModule::setCommServicesAccessToken(
    jsi::Runtime &rt,
    jsi::String accessToken) {
  auto accessTokenStr{accessToken.utf8(rt)};
  return createPromiseAsJSIValue(
      rt,
      [this, accessTokenStr](
          jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        std::string error;
        try {
          CommSecureStore::set(
              CommSecureStore::commServicesAccessToken, accessTokenStr);
        } catch (const std::exception &e) {
          error = e.what();
        }
        this->jsInvoker_->invokeAsync([error, promise]() {
          if (error.size()) {
            promise->reject(error);
          } else {
            promise->resolve(jsi::Value::undefined());
          }
        });
      });
}

jsi::Value CommCoreModule::clearCommServicesAccessToken(jsi::Runtime &rt) {
  return createPromiseAsJSIValue(
      rt, [this](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        std::string error;
        try {
          CommSecureStore::set(CommSecureStore::commServicesAccessToken, "");
        } catch (const std::exception &e) {
          error = e.what();
        }
        this->jsInvoker_->invokeAsync([error, promise]() {
          if (error.size()) {
            promise->reject(error);
          } else {
            promise->resolve(jsi::Value::undefined());
          }
        });
      });
}

void CommCoreModule::startBackupHandler(jsi::Runtime &rt) {
  try {
    ::startBackupHandler();
  } catch (const std::exception &e) {
    throw jsi::JSError(rt, e.what());
  }
}

void CommCoreModule::stopBackupHandler(jsi::Runtime &rt) {
  try {
    ::stopBackupHandler();
  } catch (const std::exception &e) {
    throw jsi::JSError(rt, e.what());
  }
}

std::string getSIWEBackupMessage() {
  std::promise<std::string> backupSIWEMessagePromise;
  std::future<std::string> backupSIWEMessageFuture =
      backupSIWEMessagePromise.get_future();
  GlobalDBSingleton::instance.scheduleOrRunCancellable(
      [&backupSIWEMessagePromise]() {
        try {
          std::string backupSecrets =
              DatabaseManager::getQueryExecutor().getMetadata(
                  "siweBackupSecrets");
          if (!backupSecrets.size()) {
            backupSIWEMessagePromise.set_value("");
          } else {
            folly::dynamic backupSecretsJSON = folly::parseJson(backupSecrets);
            std::string message = backupSecretsJSON["message"].asString();
            backupSIWEMessagePromise.set_value(message);
          }
        } catch (std::system_error &e) {
          backupSIWEMessagePromise.set_exception(std::make_exception_ptr(e));
        }
      });
  return backupSIWEMessageFuture.get();
}

jsi::Value
CommCoreModule::createFullBackup(jsi::Runtime &rt, jsi::String backupSecret) {
  std::string backupSecretStr = backupSecret.utf8(rt);
  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        std::string backupMessage;
        try {
          backupMessage = getSIWEBackupMessage();
        } catch (std::system_error &e) {
          this->jsInvoker_->invokeAsync(
              [=, &innerRt]() { promise->reject(e.what()); });
          return;
        }

        this->cryptoThread->scheduleTask([=, &innerRt]() {
          std::string error;
          std::string backupID;
          try {
            backupID = crypto::Tools::generateRandomURLSafeString(32);
          } catch (const std::exception &e) {
            error = "Failed to generate backupID";
          }

          std::string pickleKey;
          std::string pickledAccount;
          if (!error.size()) {
            try {
              pickleKey = crypto::Tools::generateRandomString(64);
              pickledAccount =
                  this->contentCryptoModule->pickleAccountToString(pickleKey);
            } catch (const std::exception &e) {
              error = "Failed to pickle crypto account";
            }
          }

          if (!error.size()) {
            auto currentID = RustPromiseManager::instance.addPromise(
                {promise, this->jsInvoker_, innerRt});
            ::createBackup(
                rust::string(backupID),
                rust::string(backupSecretStr),
                rust::string(pickleKey),
                rust::string(pickledAccount),
                rust::string(backupMessage),
                currentID);
          } else {
            this->jsInvoker_->invokeAsync(
                [=, &innerRt]() { promise->reject(error); });
          }
        });
      });
}

jsi::Value CommCoreModule::createUserKeysBackup(
    jsi::Runtime &rt,
    jsi::String backupSecret) {
  std::string backupSecretStr = backupSecret.utf8(rt);
  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        std::string backupMessage;
        try {
          backupMessage = getSIWEBackupMessage();
        } catch (std::system_error &e) {
          this->jsInvoker_->invokeAsync(
              [=, &innerRt]() { promise->reject(e.what()); });
          return;
        }

        this->cryptoThread->scheduleTask([=, &innerRt]() {
          std::string error;
          std::string backupID;
          try {
            backupID = crypto::Tools::generateRandomURLSafeString(32);
          } catch (const std::exception &e) {
            error = "Failed to generate backupID";
          }

          std::string pickleKey;
          std::string pickledAccount;
          if (!error.size()) {
            try {
              pickleKey = crypto::Tools::generateRandomString(64);
              pickledAccount =
                  this->contentCryptoModule->pickleAccountToString(pickleKey);
            } catch (const std::exception &e) {
              error = "Failed to pickle crypto account";
            }
          }

          if (!error.size()) {
            auto currentID = RustPromiseManager::instance.addPromise(
                {promise, this->jsInvoker_, innerRt});
            ::createUserKeysBackup(
                rust::string(backupID),
                rust::string(backupSecretStr),
                rust::string(pickleKey),
                rust::string(pickledAccount),
                rust::string(backupMessage),
                currentID);
          } else {
            this->jsInvoker_->invokeAsync(
                [=, &innerRt]() { promise->reject(error); });
          }
        });
      });
}

jsi::Value CommCoreModule::restoreBackupData(
    jsi::Runtime &rt,
    jsi::String backupID,
    jsi::String backupDataKey,
    jsi::String backupLogDataKey,
    jsi::String maxVersion) {
  std::string backupIDStr = backupID.utf8(rt);
  std::string backupDataKeyStr = backupDataKey.utf8(rt);
  std::string backupLogDataKeyStr = backupLogDataKey.utf8(rt);
  std::string maxVersionStr = maxVersion.utf8(rt);
  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        auto currentID = RustPromiseManager::instance.addPromise(
            {promise, this->jsInvoker_, innerRt});
        ::restoreBackupData(
            rust::string(backupIDStr),
            rust::string(backupDataKeyStr),
            rust::string(backupLogDataKeyStr),
            rust::string(maxVersionStr),
            currentID);
      });
}

jsi::Value CommCoreModule::getQRAuthBackupData(jsi::Runtime &rt) {
  return createPromiseAsJSIValue(
      rt, [this](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [this, &innerRt, promise]() {
          std::string error;
          std::string backupID;
          std::string backupDataKey;
          std::string backupLogDataKey;
          try {
            backupID =
                DatabaseManager::getQueryExecutor().getMetadata("backupID");
            folly::Optional<std::string> backupDataKeyOpt =
                CommSecureStore::get(CommSecureStore::backupDataKey);
            if (backupDataKeyOpt.hasValue()) {
              backupDataKey = backupDataKeyOpt.value();
            } else {
              throw std::runtime_error("missing backupDataKey");
            }
            folly::Optional<std::string> backupLogDataKeyOpt =
                CommSecureStore::get(CommSecureStore::backupLogDataKey);
            if (backupLogDataKeyOpt.hasValue()) {
              backupLogDataKey = backupLogDataKeyOpt.value();
            } else {
              throw std::runtime_error("missing backupLogDataKey");
            }
          } catch (const std::exception &e) {
            error = e.what();
          }
          this->jsInvoker_->invokeAsync([&innerRt,
                                         error,
                                         backupID,
                                         backupDataKey,
                                         backupLogDataKey,
                                         promise]() {
            if (error.size()) {
              promise->reject(error);
            } else {
              auto backupKeys = jsi::Object(innerRt);
              backupKeys.setProperty(
                  innerRt,
                  "backupID",
                  jsi::String::createFromUtf8(innerRt, backupID));
              backupKeys.setProperty(
                  innerRt,
                  "backupDataKey",
                  jsi::String::createFromUtf8(innerRt, backupDataKey));
              backupKeys.setProperty(
                  innerRt,
                  "backupLogDataKey",
                  jsi::String::createFromUtf8(innerRt, backupLogDataKey));
              promise->resolve(std::move(backupKeys));
            }
          });
        };
        GlobalDBSingleton::instance.scheduleOrRunCancellable(
            job, promise, this->jsInvoker_);
      });
}

jsi::Value CommCoreModule::getBackupUserKeys(
    jsi::Runtime &rt,
    jsi::String userIdentifier,
    jsi::String backupSecret,
    jsi::String backupID) {
  std::string userIdentifierStr = userIdentifier.utf8(rt);
  std::string backupSecretStr = backupSecret.utf8(rt);
  std::string backupIDStr = backupID.utf8(rt);
  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        auto currentID = RustPromiseManager::instance.addPromise(
            {promise, this->jsInvoker_, innerRt});
        ::getBackupUserKeys(
            rust::string(userIdentifierStr),
            rust::string(backupSecretStr),
            rust::string(backupIDStr),
            currentID);
      });
}

jsi::Value CommCoreModule::retrieveLatestBackupInfo(
    jsi::Runtime &rt,
    jsi::String userIdentifier) {
  std::string userIdentifierStr = userIdentifier.utf8(rt);
  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        auto currentID = RustPromiseManager::instance.addPromise(
            {promise, this->jsInvoker_, innerRt});
        ::retrieveLatestBackupInfo(rust::string(userIdentifierStr), currentID);
      });
}

jsi::Value CommCoreModule::setSIWEBackupSecrets(
    jsi::Runtime &rt,
    jsi::Object siweBackupSecrets) {
  std::string message =
      siweBackupSecrets.getProperty(rt, "message").asString(rt).utf8(rt);
  std::string signature =
      siweBackupSecrets.getProperty(rt, "signature").asString(rt).utf8(rt);
  folly::dynamic backupSecretsJSON =
      folly::dynamic::object("message", message)("signature", signature);
  std::string backupSecrets = folly::toJson(backupSecretsJSON);

  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [this, promise, backupSecrets]() {
          std::string error;
          try {
            DatabaseManager::getQueryExecutor().setMetadata(
                "siweBackupSecrets", backupSecrets);
          } catch (const std::exception &e) {
            error = e.what();
          }
          this->jsInvoker_->invokeAsync([error, promise]() {
            if (error.size()) {
              promise->reject(error);
            } else {
              promise->resolve(jsi::Value::undefined());
            }
          });
        };
        GlobalDBSingleton::instance.scheduleOrRunCancellable(
            job, promise, this->jsInvoker_);
      });
}

jsi::Value CommCoreModule::getSIWEBackupSecrets(jsi::Runtime &rt) {
  return createPromiseAsJSIValue(
      rt, [this](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [this, &innerRt, promise]() {
          std::string error;
          std::string backupSecrets;
          try {
            backupSecrets = DatabaseManager::getQueryExecutor().getMetadata(
                "siweBackupSecrets");
          } catch (const std::exception &e) {
            error = e.what();
          }
          this->jsInvoker_->invokeAsync(
              [&innerRt, error, backupSecrets, promise]() {
                if (error.size()) {
                  promise->reject(error);
                } else if (!backupSecrets.size()) {
                  promise->resolve(jsi::Value::undefined());
                } else {
                  folly::dynamic backupSecretsJSON =
                      folly::parseJson(backupSecrets);
                  std::string message = backupSecretsJSON["message"].asString();
                  std::string signature =
                      backupSecretsJSON["signature"].asString();

                  auto siweBackupSecrets = jsi::Object(innerRt);
                  siweBackupSecrets.setProperty(
                      innerRt,
                      "message",
                      jsi::String::createFromUtf8(innerRt, message));
                  siweBackupSecrets.setProperty(
                      innerRt,
                      "signature",
                      jsi::String::createFromUtf8(innerRt, signature));
                  promise->resolve(std::move(siweBackupSecrets));
                }
              });
        };
        GlobalDBSingleton::instance.scheduleOrRunCancellable(
            job, promise, this->jsInvoker_);
      });
}

jsi::Value CommCoreModule::setUserDataKeys(
    jsi::Runtime &rt,
    jsi::String backupDataKey,
    jsi::String backupLogDataKey) {
  auto backupDataKeyCpp{backupDataKey.utf8(rt)};
  auto backupLogDataKeyCpp{backupLogDataKey.utf8(rt)};

  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=]() {
          std::string error;
          try {
            DatabaseManager::getQueryExecutor().setUserDataKeys(
                backupDataKeyCpp, backupLogDataKeyCpp);
          } catch (std::system_error &e) {
            error = e.what();
          }
          this->jsInvoker_->invokeAsync([error, promise]() {
            if (error.size()) {
              promise->reject(error);
            } else {
              promise->resolve(jsi::Value::undefined());
            }
          });
        };
        GlobalDBSingleton::instance.scheduleOrRunCancellable(
            job, promise, this->jsInvoker_);
      });
}

jsi::Value CommCoreModule::getAllInboundP2PMessages(jsi::Runtime &rt) {
  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=, &innerRt]() {
          std::string error;
          std::vector<InboundP2PMessage> messages;

          try {
            messages =
                DatabaseManager::getQueryExecutor().getAllInboundP2PMessage();

          } catch (std::system_error &e) {
            error = e.what();
          }
          auto messagesPtr = std::make_shared<std::vector<InboundP2PMessage>>(
              std::move(messages));

          this->jsInvoker_->invokeAsync(
              [&innerRt, messagesPtr, error, promise]() {
                if (error.size()) {
                  promise->reject(error);
                  return;
                }

                jsi::Array jsiMessages =
                    parseInboundingMessages(innerRt, messagesPtr);

                promise->resolve(std::move(jsiMessages));
              });
        };
        GlobalDBSingleton::instance.scheduleOrRunCancellable(
            job, promise, this->jsInvoker_);
      });
}

jsi::Value
CommCoreModule::removeInboundP2PMessages(jsi::Runtime &rt, jsi::Array ids) {
  std::vector<std::string> msgIDsCPP{};
  for (auto idx = 0; idx < ids.size(rt); idx++) {
    std::string msgID = ids.getValueAtIndex(rt, idx).asString(rt).utf8(rt);
    msgIDsCPP.push_back(msgID);
  }

  return createPromiseAsJSIValue(
      rt,
      [this,
       msgIDsCPP](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [this, promise, msgIDsCPP]() {
          std::string error;
          try {
            DatabaseManager::getQueryExecutor().removeInboundP2PMessages(
                msgIDsCPP);
          } catch (std::system_error &e) {
            error = e.what();
          }
          this->jsInvoker_->invokeAsync([error, promise]() {
            if (error.size()) {
              promise->reject(error);
            } else {
              promise->resolve(jsi::Value::undefined());
            }
          });
        };
        GlobalDBSingleton::instance.scheduleOrRunCancellable(
            job, promise, this->jsInvoker_);
      });
}

jsi::Value
CommCoreModule::getInboundP2PMessagesByID(jsi::Runtime &rt, jsi::Array ids) {
  std::vector<std::string> msgIDsCPP{};
  for (auto idx = 0; idx < ids.size(rt); idx++) {
    std::string msgID = ids.getValueAtIndex(rt, idx).asString(rt).utf8(rt);
    msgIDsCPP.push_back(msgID);
  }

  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=, &innerRt]() {
          std::string error;
          std::vector<InboundP2PMessage> messages;

          try {
            messages =
                DatabaseManager::getQueryExecutor().getInboundP2PMessagesByID(
                    msgIDsCPP);
          } catch (std::system_error &e) {
            error = e.what();
          }
          auto messagesPtr = std::make_shared<std::vector<InboundP2PMessage>>(
              std::move(messages));

          this->jsInvoker_->invokeAsync(
              [&innerRt, messagesPtr, error, promise]() {
                if (error.size()) {
                  promise->reject(error);
                  return;
                }

                jsi::Array jsiMessages =
                    parseInboundingMessages(innerRt, messagesPtr);

                promise->resolve(std::move(jsiMessages));
              });
        };
        GlobalDBSingleton::instance.scheduleOrRunCancellable(
            job, promise, this->jsInvoker_);
      });
}

jsi::Value
CommCoreModule::getOutboundP2PMessagesByID(jsi::Runtime &rt, jsi::Array ids) {
  std::vector<std::string> msgIDsCPP{};
  for (auto idx = 0; idx < ids.size(rt); idx++) {
    std::string msgID = ids.getValueAtIndex(rt, idx).asString(rt).utf8(rt);
    msgIDsCPP.push_back(msgID);
  }

  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=, &innerRt]() {
          std::string error;
          std::vector<OutboundP2PMessage> messages;

          try {
            messages =
                DatabaseManager::getQueryExecutor().getOutboundP2PMessagesByID(
                    msgIDsCPP);

          } catch (std::system_error &e) {
            error = e.what();
          }
          auto messagesPtr = std::make_shared<std::vector<OutboundP2PMessage>>(
              std::move(messages));

          this->jsInvoker_->invokeAsync(
              [&innerRt, messagesPtr, error, promise]() {
                if (error.size()) {
                  promise->reject(error);
                  return;
                }

                jsi::Array jsiMessages =
                    jsi::Array(innerRt, messagesPtr->size());
                size_t writeIdx = 0;
                for (const OutboundP2PMessage &msg : *messagesPtr) {
                  jsi::Object jsiMsg = jsi::Object(innerRt);
                  jsiMsg.setProperty(innerRt, "messageID", msg.message_id);
                  jsiMsg.setProperty(innerRt, "deviceID", msg.device_id);
                  jsiMsg.setProperty(innerRt, "userID", msg.user_id);
                  jsiMsg.setProperty(innerRt, "timestamp", msg.timestamp);
                  jsiMsg.setProperty(innerRt, "plaintext", msg.plaintext);
                  jsiMsg.setProperty(innerRt, "ciphertext", msg.ciphertext);
                  jsiMsg.setProperty(innerRt, "status", msg.status);
                  jsiMsg.setProperty(
                      innerRt, "supportsAutoRetry", msg.supports_auto_retry);
                  jsiMessages.setValueAtIndex(innerRt, writeIdx++, jsiMsg);
                }

                promise->resolve(std::move(jsiMessages));
              });
        };
        GlobalDBSingleton::instance.scheduleOrRunCancellable(
            job, promise, this->jsInvoker_);
      });
}

jsi::Value CommCoreModule::getUnsentOutboundP2PMessages(jsi::Runtime &rt) {
  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=, &innerRt]() {
          std::string error;
          std::vector<OutboundP2PMessage> messages;

          try {
            messages = DatabaseManager::getQueryExecutor()
                           .getUnsentOutboundP2PMessages();

          } catch (std::system_error &e) {
            error = e.what();
          }
          auto messagesPtr = std::make_shared<std::vector<OutboundP2PMessage>>(
              std::move(messages));

          this->jsInvoker_->invokeAsync(
              [&innerRt, messagesPtr, error, promise]() {
                if (error.size()) {
                  promise->reject(error);
                  return;
                }

                jsi::Array jsiMessages =
                    jsi::Array(innerRt, messagesPtr->size());
                size_t writeIdx = 0;
                for (const OutboundP2PMessage &msg : *messagesPtr) {
                  jsi::Object jsiMsg = jsi::Object(innerRt);
                  jsiMsg.setProperty(innerRt, "messageID", msg.message_id);
                  jsiMsg.setProperty(innerRt, "deviceID", msg.device_id);
                  jsiMsg.setProperty(innerRt, "userID", msg.user_id);
                  jsiMsg.setProperty(innerRt, "timestamp", msg.timestamp);
                  jsiMsg.setProperty(innerRt, "plaintext", msg.plaintext);
                  jsiMsg.setProperty(innerRt, "ciphertext", msg.ciphertext);
                  jsiMsg.setProperty(innerRt, "status", msg.status);
                  jsiMsg.setProperty(
                      innerRt, "supportsAutoRetry", msg.supports_auto_retry);
                  jsiMessages.setValueAtIndex(innerRt, writeIdx++, jsiMsg);
                }

                promise->resolve(std::move(jsiMessages));
              });
        };
        GlobalDBSingleton::instance.scheduleOrRunCancellable(
            job, promise, this->jsInvoker_);
      });
}

jsi::Value CommCoreModule::markOutboundP2PMessageAsSent(
    jsi::Runtime &rt,
    jsi::String messageID,
    jsi::String deviceID) {
  auto messageIDCpp{messageID.utf8(rt)};
  auto deviceIDCpp{deviceID.utf8(rt)};

  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=]() {
          std::string error;
          try {
            DatabaseManager::getQueryExecutor().markOutboundP2PMessageAsSent(
                messageIDCpp, deviceIDCpp);
          } catch (std::system_error &e) {
            error = e.what();
          }
          this->jsInvoker_->invokeAsync([error, promise]() {
            if (error.size()) {
              promise->reject(error);
            } else {
              promise->resolve(jsi::Value::undefined());
            }
          });
        };
        GlobalDBSingleton::instance.scheduleOrRunCancellable(
            job, promise, this->jsInvoker_);
      });
}

jsi::Value CommCoreModule::removeOutboundP2PMessage(
    jsi::Runtime &rt,
    jsi::String messageID,
    jsi::String deviceID) {
  auto messageIDCpp{messageID.utf8(rt)};
  auto deviceIDCpp{deviceID.utf8(rt)};

  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=]() {
          std::string error;
          try {
            DatabaseManager::getQueryExecutor().removeOutboundP2PMessage(
                messageIDCpp, deviceIDCpp);
          } catch (std::system_error &e) {
            error = e.what();
          }
          this->jsInvoker_->invokeAsync([error, promise]() {
            if (error.size()) {
              promise->reject(error);
            } else {
              promise->resolve(jsi::Value::undefined());
            }
          });
        };
        GlobalDBSingleton::instance.scheduleOrRunCancellable(
            job, promise, this->jsInvoker_);
      });
}

jsi::Value CommCoreModule::resetOutboundP2PMessagesForDevice(
    jsi::Runtime &rt,
    jsi::String deviceID) {
  std::string deviceIDCpp{deviceID.utf8(rt)};

  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=, &innerRt]() {
          std::string error;
          std::vector<std::string> messageIDs;

          try {
            DatabaseManager::getQueryExecutor().beginTransaction();
            messageIDs = DatabaseManager::getQueryExecutor()
                             .resetOutboundP2PMessagesForDevice(deviceIDCpp);
            DatabaseManager::getQueryExecutor().commitTransaction();
          } catch (std::system_error &e) {
            error = e.what();
            DatabaseManager::getQueryExecutor().rollbackTransaction();
          }

          auto messageIDsPtr =
              std::make_shared<std::vector<std::string>>(std::move(messageIDs));

          this->jsInvoker_->invokeAsync(
              [&innerRt, messageIDsPtr, error, promise]() {
                if (error.size()) {
                  promise->reject(error);
                  return;
                }

                jsi::Array jsiMessageIDs =
                    jsi::Array(innerRt, messageIDsPtr->size());
                size_t writeIdx = 0;
                for (const std::string &id : *messageIDsPtr) {
                  jsi::String jsiString =
                      jsi::String::createFromUtf8(innerRt, id);
                  jsiMessageIDs.setValueAtIndex(innerRt, writeIdx++, jsiString);
                }

                promise->resolve(std::move(jsiMessageIDs));
              });
        };
        GlobalDBSingleton::instance.scheduleOrRunCancellable(
            job, promise, this->jsInvoker_);
      });
}

jsi::Value CommCoreModule::getSyncedDatabaseVersion(jsi::Runtime &rt) {
  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=, &innerRt]() {
          std::string error;
          std::vector<SyncedMetadataEntry> syncedMetadataStoreVector;
          try {
            syncedMetadataStoreVector =
                DatabaseManager::getQueryExecutor().getAllSyncedMetadata();
          } catch (std::system_error &e) {
            error = e.what();
          }
          std::string version;
          for (auto &entry : syncedMetadataStoreVector) {
            if (entry.name == "db_version") {
              version = entry.data;
            }
          }

          this->jsInvoker_->invokeAsync([&innerRt, error, promise, version]() {
            if (error.size()) {
              promise->reject(error);
              return;
            }
            jsi::String jsiVersion =
                jsi::String::createFromUtf8(innerRt, version);
            promise->resolve(std::move(jsiVersion));
          });
        };
        GlobalDBSingleton::instance.scheduleOrRunCancellable(
            job, promise, this->jsInvoker_);
      });
}

jsi::Value CommCoreModule::markPrekeysAsPublished(jsi::Runtime &rt) {
  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=, &innerRt]() {
          std::string error;

          if (this->contentCryptoModule == nullptr ||
              !NotificationsCryptoModule::isNotificationsAccountInitialized()) {
            this->jsInvoker_->invokeAsync([=, &innerRt]() {
              promise->reject("user has not been initialized");
            });
            return;
          }

          std::optional<
              std::pair<std::shared_ptr<crypto::CryptoModule>, std::string>>
              notifsCryptoModuleWithPicklingKey;
          try {
            notifsCryptoModuleWithPicklingKey =
                NotificationsCryptoModule::fetchNotificationsAccount();
            this->contentCryptoModule->markPrekeyAsPublished();
            notifsCryptoModuleWithPicklingKey.value()
                .first->markPrekeyAsPublished();
            this->persistCryptoModules(true, notifsCryptoModuleWithPicklingKey);
          } catch (std::exception &e) {
            error = e.what();
          }

          this->jsInvoker_->invokeAsync([=]() {
            if (error.size()) {
              promise->reject(error);
              return;
            }
            promise->resolve(jsi::Value::undefined());
          });
        };

        this->cryptoThread->scheduleTask(job);
      });
}

jsi::Value
CommCoreModule::getRelatedMessages(jsi::Runtime &rt, jsi::String messageID) {
  std::string messageIDStr = messageID.utf8(rt);
  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=, &innerRt]() {
          std::string error;
          std::shared_ptr<std::vector<MessageEntity>> messages;
          try {
            messages = std::make_shared<std::vector<MessageEntity>>(
                DatabaseManager::getQueryExecutor().getRelatedMessages(
                    messageIDStr));
          } catch (std::system_error &e) {
            error = e.what();
          }

          this->jsInvoker_->invokeAsync([&innerRt,
                                         error,
                                         promise,
                                         messages,
                                         messageStore = this->messageStore]() {
            if (error.size()) {
              promise->reject(error);
              return;
            }

            jsi::Array jsiMessages =
                messageStore.parseDBDataStore(innerRt, messages);
            promise->resolve(std::move(jsiMessages));
          });
        };
        GlobalDBSingleton::instance.scheduleOrRunCancellable(
            job, promise, this->jsInvoker_);
      });
}

jsi::Value CommCoreModule::searchMessages(
    jsi::Runtime &rt,
    jsi::String query,
    jsi::String threadID,
    std::optional<jsi::String> timestampCursor,
    std::optional<jsi::String> messageIDCursor) {
  std::string queryStr = query.utf8(rt);
  std::string threadIDStr = threadID.utf8(rt);

  std::optional<std::string> timestampCursorCpp;
  if (timestampCursor) {
    timestampCursorCpp = timestampCursor->utf8(rt);
  }

  std::optional<std::string> messageIDCursorCpp;
  if (messageIDCursor) {
    messageIDCursorCpp = messageIDCursor->utf8(rt);
  }

  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=, &innerRt]() {
          std::string error;
          std::shared_ptr<std::vector<MessageEntity>> messages;
          try {
            messages = std::make_shared<std::vector<MessageEntity>>(
                DatabaseManager::getQueryExecutor().searchMessages(
                    queryStr,
                    threadIDStr,
                    timestampCursorCpp,
                    messageIDCursorCpp));
          } catch (std::system_error &e) {
            error = e.what();
          }

          this->jsInvoker_->invokeAsync([&innerRt,
                                         error,
                                         promise,
                                         messages,
                                         messageStore = this->messageStore]() {
            if (error.size()) {
              promise->reject(error);
              return;
            }

            jsi::Array jsiMessages =
                messageStore.parseDBDataStore(innerRt, messages);
            promise->resolve(std::move(jsiMessages));
          });
        };
        GlobalDBSingleton::instance.scheduleOrRunCancellable(
            job, promise, this->jsInvoker_);
      });
};

jsi::Value CommCoreModule::fetchMessages(
    jsi::Runtime &rt,
    jsi::String threadID,
    double limit,
    double offset) {
  std::string threadIDCpp = threadID.utf8(rt);
  int limitInt = std::lround(limit);
  int offsetInt = std::lround(offset);

  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=, &innerRt]() {
          std::string error;
          std::shared_ptr<std::vector<MessageEntity>> messages;
          try {
            messages = std::make_shared<std::vector<MessageEntity>>(
                DatabaseManager::getQueryExecutor().fetchMessages(
                    threadIDCpp, limitInt, offsetInt));
          } catch (std::system_error &e) {
            error = e.what();
          }

          this->jsInvoker_->invokeAsync([&innerRt,
                                         error,
                                         promise,
                                         messages,
                                         messageStore = this->messageStore]() {
            if (error.size()) {
              promise->reject(error);
              return;
            }

            jsi::Array jsiMessages =
                messageStore.parseDBDataStore(innerRt, messages);
            promise->resolve(std::move(jsiMessages));
          });
        };
        GlobalDBSingleton::instance.scheduleOrRunCancellable(
            job, promise, this->jsInvoker_);
      });
}

jsi::Value CommCoreModule::restoreUser(
    jsi::Runtime &rt,
    jsi::String userID,
    std::optional<jsi::String> siweSocialProofMessage,
    std::optional<jsi::String> siweSocialProofSignature,
    jsi::String keyPayload,
    jsi::String keyPayloadSignature,
    jsi::String contentPrekey,
    jsi::String contentPrekeySignature,
    jsi::String notifPrekey,
    jsi::String notifPrekeySignature,
    jsi::Array contentOneTimeKeys,
    jsi::Array notifOneTimeKeys,
    jsi::String deviceList,
    jsi::String backupSecret) {
  rust::String siweSocialProofMessageRust = "";
  if (siweSocialProofMessage.has_value()) {
    siweSocialProofMessageRust =
        jsiStringToRustString(siweSocialProofMessage.value(), rt);
  }
  rust::String siweSocialProofSignatureRust = "";
  if (siweSocialProofSignature.has_value()) {
    siweSocialProofSignatureRust =
        jsiStringToRustString(siweSocialProofSignature.value(), rt);
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
  auto backupSecretRust = jsiStringToRustString(backupSecret, rt);

  return createPromiseAsJSIValue(
      rt, [=, this](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        std::string backupMessage;
        try {
          backupMessage = getSIWEBackupMessage();
        } catch (std::system_error &e) {
          this->jsInvoker_->invokeAsync(
              [=, &innerRt]() { promise->reject(e.what()); });
          return;
        }

        this->cryptoThread->scheduleTask([=, &innerRt]() {
          std::string error;
          std::string backupID;
          try {
            backupID = crypto::Tools::generateRandomURLSafeString(32);
          } catch (const std::exception &e) {
            error = "Failed to generate backupID";
          }

          std::string pickleKey;
          std::string pickledAccount;
          if (!error.size()) {
            try {
              pickleKey = crypto::Tools::generateRandomString(64);
              pickledAccount =
                  this->contentCryptoModule->pickleAccountToString(pickleKey);
            } catch (const std::exception &e) {
              error = "Failed to pickle crypto account";
            }
          }

          if (!error.size()) {
            try {
              auto currentID = RustPromiseManager::instance.addPromise(
                  {promise, this->jsInvoker_, innerRt});
              identityRestoreUser(
                  userIDRust,
                  siweSocialProofMessageRust,
                  siweSocialProofSignatureRust,
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
          }

          if (!error.empty()) {
            this->jsInvoker_->invokeAsync(
                [error, promise]() { promise->reject(error); });
          }
        });
      });
}

} // namespace comm
