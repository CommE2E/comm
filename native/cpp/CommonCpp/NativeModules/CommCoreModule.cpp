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
          std::vector<std::pair<Message, std::vector<Media>>> messagesVector;
          std::vector<MessageStoreThread> messageStoreThreadsVector;
          std::vector<Report> reportStoreVector;
          std::vector<UserInfo> userStoreVector;
          std::vector<KeyserverInfo> keyserverStoreVector;
          std::vector<CommunityInfo> communityStoreVector;
          try {
            draftsVector = DatabaseManager::getQueryExecutor().getAllDrafts();
            messagesVector =
                DatabaseManager::getQueryExecutor().getAllMessages();
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
          } catch (std::system_error &e) {
            error = e.what();
          }
          auto draftsVectorPtr =
              std::make_shared<std::vector<Draft>>(std::move(draftsVector));
          auto messagesVectorPtr = std::make_shared<
              std::vector<std::pair<Message, std::vector<Media>>>>(
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
          this->jsInvoker_->invokeAsync([&innerRt,
                                         draftsVectorPtr,
                                         messagesVectorPtr,
                                         threadsVectorPtr,
                                         messageStoreThreadsVectorPtr,
                                         reportStoreVectorPtr,
                                         userStoreVectorPtr,
                                         keyserveStoreVectorPtr,
                                         communityStoreVectorPtr,
                                         error,
                                         promise,
                                         draftStore = this->draftStore,
                                         threadStore = this->threadStore,
                                         messageStore = this->messageStore,
                                         reportStore = this->reportStore,
                                         userStore = this->userStore,
                                         keyserverStore = this->keyserverStore,
                                         communityStore =
                                             this->communityStore]() {
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

jsi::Array CommCoreModule::getAllMessagesSync(jsi::Runtime &rt) {
  auto messagesVector = NativeModuleUtils::runSyncOrThrowJSError<
      std::vector<std::pair<Message, std::vector<Media>>>>(rt, []() {
    return DatabaseManager::getQueryExecutor().getAllMessages();
  });
  auto messagesVectorPtr =
      std::make_shared<std::vector<std::pair<Message, std::vector<Media>>>>(
          std::move(messagesVector));
  jsi::Array jsiMessages =
      this->messageStore.parseDBDataStore(rt, messagesVectorPtr);
  return jsiMessages;
}

jsi::Value CommCoreModule::processDraftStoreOperations(
    jsi::Runtime &rt,
    jsi::Array operations) {
  return this->draftStore.processStoreOperations(rt, std::move(operations));
}

jsi::Value CommCoreModule::processMessageStoreOperations(
    jsi::Runtime &rt,
    jsi::Array operations) {
  return this->messageStore.processStoreOperations(rt, std::move(operations));
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

jsi::Value CommCoreModule::processThreadStoreOperations(
    jsi::Runtime &rt,
    jsi::Array operations) {
  return this->threadStore.processStoreOperations(rt, std::move(operations));
}

void CommCoreModule::processThreadStoreOperationsSync(
    jsi::Runtime &rt,
    jsi::Array operations) {
  this->threadStore.processStoreOperationsSync(rt, std::move(operations));
}

jsi::Value CommCoreModule::processReportStoreOperations(
    jsi::Runtime &rt,
    jsi::Array operations) {
  return this->reportStore.processStoreOperations(rt, std::move(operations));
}

void CommCoreModule::processReportStoreOperationsSync(
    jsi::Runtime &rt,
    jsi::Array operations) {
  this->reportStore.processStoreOperationsSync(rt, std::move(operations));
}

jsi::Value CommCoreModule::processUserStoreOperations(
    jsi::Runtime &rt,
    jsi::Array operations) {
  return this->userStore.processStoreOperations(rt, std::move(operations));
}

jsi::Value CommCoreModule::processKeyserverStoreOperations(
    jsi::Runtime &rt,
    jsi::Array operations) {
  return this->keyserverStore.processStoreOperations(rt, std::move(operations));
}

jsi::Value CommCoreModule::processCommunityStoreOperations(
    jsi::Runtime &rt,
    jsi::Array operations) {
  return this->communityStore.processStoreOperations(rt, std::move(operations));
}

void CommCoreModule::terminate(jsi::Runtime &rt) {
  TerminateApp::terminate();
}

void CommCoreModule::persistCryptoModule() {
  folly::Optional<std::string> storedSecretKey =
      CommSecureStore::get(this->secureStoreAccountDataKey);
  if (!storedSecretKey.hasValue()) {
    storedSecretKey = crypto::Tools::generateRandomString(64);
    CommSecureStore::set(
        this->secureStoreAccountDataKey, storedSecretKey.value());
  }

  crypto::Persist newPersist =
      this->cryptoModule->storeAsB64(storedSecretKey.value());

  std::promise<void> persistencePromise;
  std::future<void> persistenceFuture = persistencePromise.get_future();
  GlobalDBSingleton::instance.scheduleOrRunCancellable(
      [=, &persistencePromise]() {
        try {
          DatabaseManager::getQueryExecutor().storeOlmPersistData(
              DatabaseManager::getQueryExecutor().getContentAccountID(),
              newPersist);
          persistencePromise.set_value();
        } catch (std::system_error &e) {
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
          crypto::Persist persist;
          std::string error;
          try {
            std::optional<std::string> accountData =
                DatabaseManager::getQueryExecutor().getOlmPersistAccountData(
                    DatabaseManager::getQueryExecutor().getContentAccountID());
            if (accountData.has_value()) {
              persist.account =
                  crypto::OlmBuffer(accountData->begin(), accountData->end());
              // handle sessions data
              std::vector<OlmPersistSession> sessionsData =
                  DatabaseManager::getQueryExecutor()
                      .getOlmPersistSessionsData();
              for (OlmPersistSession &sessionsDataItem : sessionsData) {
                crypto::OlmBuffer sessionDataBuffer(
                    sessionsDataItem.session_data.begin(),
                    sessionsDataItem.session_data.end());
                persist.sessions.insert(std::make_pair(
                    sessionsDataItem.target_user_id, sessionDataBuffer));
              }
            }
          } catch (std::system_error &e) {
            error = e.what();
          }

          this->cryptoThread->scheduleTask([=]() {
            std::string error;
            this->cryptoModule.reset(new crypto::CryptoModule(
                this->publicCryptoAccountID, storedSecretKey.value(), persist));
            if (persist.isEmpty()) {
              crypto::Persist newPersist =
                  this->cryptoModule->storeAsB64(storedSecretKey.value());
              GlobalDBSingleton::instance.scheduleOrRunCancellable(
                  [=]() {
                    std::string error;
                    try {
                      DatabaseManager::getQueryExecutor().storeOlmPersistData(
                          DatabaseManager::getQueryExecutor()
                              .getContentAccountID(),
                          newPersist);
                    } catch (std::system_error &e) {
                      error = e.what();
                    }
                    this->jsInvoker_->invokeAsync([=]() {
                      if (error.size()) {
                        promise->reject(error);
                        return;
                      }
                    });
                  },
                  promise,
                  this->jsInvoker_);

            } else {
              this->cryptoModule->restoreFromB64(
                  storedSecretKey.value(), persist);
              this->jsInvoker_->invokeAsync([=]() {
                if (error.size()) {
                  promise->reject(error);
                  return;
                }
              });
            }
            try {
              NotificationsCryptoModule::initializeNotificationsCryptoAccount(
                  "Comm");
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
          });
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
          if (this->cryptoModule == nullptr) {
            error = "user has not been initialized";
          } else {
            primaryKeysResult = this->cryptoModule->getIdentityKeys();
          }
          try {
            if (!error.size()) {
              notificationsKeysResult =
                  NotificationsCryptoModule::getNotificationsIdentityKeys(
                      "Comm");
            }
          } catch (const std::exception &e) {
            error = e.what();
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
                signatureCpp = this->cryptoModule->signMessage(blobPayloadCpp);
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

jsi::Value
CommCoreModule::getOneTimeKeys(jsi::Runtime &rt, double oneTimeKeysAmount) {
  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=, &innerRt]() {
          std::string error;
          std::string contentResult;
          std::string notifResult;
          if (this->cryptoModule == nullptr) {
            this->jsInvoker_->invokeAsync([=, &innerRt]() {
              promise->reject("user has not been initialized");
            });
            return;
          }
          try {
            contentResult = this->cryptoModule->getOneTimeKeysForPublishing(
                oneTimeKeysAmount);
            this->persistCryptoModule();
            notifResult = NotificationsCryptoModule::
                getNotificationsOneTimeKeysForPublishing(
                    oneTimeKeysAmount, "Comm");
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

std::pair<std::string, std::string> getNotificationsPrekeyAndSignature() {
  // TODO: Implement notifs prekey rotation.
  // Notifications prekey is not rotated at this moment. It
  // is fetched with signature to match identity service API.
  std::string notificationsPrekey =
      NotificationsCryptoModule::getNotificationsPrekey("Comm");
  std::string notificationsPrekeySignature =
      NotificationsCryptoModule::getNotificationsPrekeySignature("Comm");

  return std::make_pair(notificationsPrekey, notificationsPrekeySignature);
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
          std::optional<std::string> maybePrekeyToUpload;

          if (this->cryptoModule == nullptr) {
            this->jsInvoker_->invokeAsync([=, &innerRt]() {
              promise->reject("user has not been initialized");
            });
            return;
          }

          try {
            maybePrekeyToUpload = this->cryptoModule->validatePrekey();
            this->persistCryptoModule();
            if (!maybePrekeyToUpload.has_value()) {
              maybePrekeyToUpload = this->cryptoModule->getUnpublishedPrekey();
            }
          } catch (const std::exception &e) {
            error = e.what();
          }

          if (error.size()) {
            this->jsInvoker_->invokeAsync(
                [=, &innerRt]() { promise->reject(error); });
            return;
          } else if (!maybePrekeyToUpload.has_value()) {
            this->jsInvoker_->invokeAsync(
                [=]() { promise->resolve(jsi::Value::undefined()); });
            return;
          }

          std::string prekeyToUpload = maybePrekeyToUpload.value();
          std::string prekeyUploadError;

          try {
            std::string prekeySignature =
                this->cryptoModule->getPrekeySignature();
            std::string notificationsPrekey, notificationsPrekeySignature;
            std::tie(notificationsPrekey, notificationsPrekeySignature) =
                getNotificationsPrekeyAndSignature();

            try {
              std::promise<folly::dynamic> prekeyPromise;
              std::future<folly::dynamic> prekeyFuture =
                  prekeyPromise.get_future();
              RustPromiseManager::CPPPromiseInfo promiseInfo = {
                  std::move(prekeyPromise)};
              auto currentID = RustPromiseManager::instance.addPromise(
                  std::move(promiseInfo));
              ::identityRefreshUserPrekeys(
                  authUserIDRust,
                  authDeviceIDRust,
                  authAccessTokenRust,
                  rust::string(prekeyToUpload),
                  rust::string(prekeySignature),
                  rust::string(notificationsPrekey),
                  rust::string(notificationsPrekeySignature),
                  currentID);
              prekeyFuture.get();
            } catch (const std::exception &e) {
              prekeyUploadError = e.what();
            }

            if (!prekeyUploadError.size()) {
              this->cryptoModule->markPrekeyAsPublished();
              this->persistCryptoModule();
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
          std::string contentPrekeySignature, notifPrekey, notifPrekeySignature;
          std::optional<std::string> contentPrekey;

          if (this->cryptoModule == nullptr) {
            this->jsInvoker_->invokeAsync([=, &innerRt]() {
              promise->reject("user has not been initialized");
            });
            return;
          }
          try {
            contentPrekey = this->cryptoModule->validatePrekey();
            if (!contentPrekey) {
              contentPrekey = this->cryptoModule->getUnpublishedPrekey();
            }
            if (!contentPrekey) {
              contentPrekey = this->cryptoModule->getPrekey();
            }
            this->persistCryptoModule();

            contentPrekeySignature = this->cryptoModule->getPrekeySignature();

            std::tie(notifPrekey, notifPrekeySignature) =
                getNotificationsPrekeyAndSignature();

          } catch (const std::exception &e) {
            error = e.what();
          }

          this->jsInvoker_->invokeAsync([=, &innerRt]() {
            if (error.size()) {
              promise->reject(error);
              return;
            }
            auto contentPrekeyJSI =
                jsi::String::createFromUtf8(innerRt, contentPrekey.value());
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
    jsi::String oneTimeKey,
    jsi::String keyserverID) {
  auto identityKeysCpp{identityKeys.utf8(rt)};
  auto prekeyCpp{prekey.utf8(rt)};
  auto prekeySignatureCpp{prekeySignature.utf8(rt)};
  auto oneTimeKeyCpp{oneTimeKey.utf8(rt)};
  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=, &innerRt]() {
          std::string error;
          crypto::EncryptedData result;
          try {
            result = NotificationsCryptoModule::initializeNotificationsSession(
                identityKeysCpp,
                prekeyCpp,
                prekeySignatureCpp,
                oneTimeKeyCpp,
                "Comm");
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

jsi::Value CommCoreModule::initializeContentOutboundSession(
    jsi::Runtime &rt,
    jsi::String identityKeys,
    jsi::String prekey,
    jsi::String prekeySignature,
    jsi::String oneTimeKey,
    jsi::String deviceID) {
  auto identityKeysCpp{identityKeys.utf8(rt)};
  auto prekeyCpp{prekey.utf8(rt)};
  auto prekeySignatureCpp{prekeySignature.utf8(rt)};
  auto oneTimeKeyCpp{oneTimeKey.utf8(rt)};
  auto deviceIDCpp{deviceID.utf8(rt)};
  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=, &innerRt]() {
          std::string error;
          crypto::EncryptedData initialEncryptedMessage;
          try {
            this->cryptoModule->initializeOutboundForSendingSession(
                deviceIDCpp,
                std::vector<uint8_t>(
                    identityKeysCpp.begin(), identityKeysCpp.end()),
                std::vector<uint8_t>(prekeyCpp.begin(), prekeyCpp.end()),
                std::vector<uint8_t>(
                    prekeySignatureCpp.begin(), prekeySignatureCpp.end()),
                std::vector<uint8_t>(
                    oneTimeKeyCpp.begin(), oneTimeKeyCpp.end()));

            const std::string initMessage = "{\"type\": \"init\"}";
            initialEncryptedMessage =
                cryptoModule->encrypt(deviceIDCpp, initMessage);
            this->persistCryptoModule();
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
                std::string{
                    initialEncryptedMessage.message.begin(),
                    initialEncryptedMessage.message.end()}));
          });
        };
        this->cryptoThread->scheduleTask(job);
      });
}

jsi::Value CommCoreModule::initializeContentInboundSession(
    jsi::Runtime &rt,
    jsi::String identityKeys,
    jsi::String encryptedMessage,
    jsi::String deviceID) {
  auto identityKeysCpp{identityKeys.utf8(rt)};
  auto encryptedMessageCpp{encryptedMessage.utf8(rt)};
  auto deviceIDCpp{deviceID.utf8(rt)};
  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=, &innerRt]() {
          std::string error;
          std::string decryptedMessage;
          try {
            this->cryptoModule->initializeInboundForReceivingSession(
                deviceIDCpp,
                std::vector<uint8_t>(
                    encryptedMessageCpp.begin(), encryptedMessageCpp.end()),
                std::vector<uint8_t>(
                    identityKeysCpp.begin(), identityKeysCpp.end()));
            crypto::EncryptedData encryptedData{std::vector<uint8_t>(
                encryptedMessageCpp.begin(), encryptedMessageCpp.end())};
            decryptedMessage =
                cryptoModule->decrypt(deviceIDCpp, encryptedData);
            this->persistCryptoModule();
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
            encryptedMessage = cryptoModule->encrypt(deviceIDCpp, messageCpp);
            this->persistCryptoModule();
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
                std::string{
                    encryptedMessage.message.begin(),
                    encryptedMessage.message.end()}));
          });
        };
        this->cryptoThread->scheduleTask(job);
      });
}

jsi::Value CommCoreModule::decrypt(
    jsi::Runtime &rt,
    jsi::String message,
    jsi::String deviceID) {
  auto messageCpp{message.utf8(rt)};
  auto deviceIDCpp{deviceID.utf8(rt)};
  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=, &innerRt]() {
          std::string error;
          std::string decryptedMessage;
          try {
            crypto::EncryptedData encryptedData{
                std::vector<uint8_t>(messageCpp.begin(), messageCpp.end()),
                ENCRYPTED_MESSAGE_TYPE};
            decryptedMessage =
                cryptoModule->decrypt(deviceIDCpp, encryptedData);
            this->persistCryptoModule();
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
            signature = this->cryptoModule->signMessage(messageStr);
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
      communityStore(jsInvoker) {
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
CommCoreModule::setCurrentUserID(jsi::Runtime &rt, jsi::String userID) {
  auto currentUserID{userID.utf8(rt)};
  return createPromiseAsJSIValue(
      rt,
      [this,
       currentUserID](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [this, promise, currentUserID]() {
          std::string error;
          try {
            DatabaseManager::getQueryExecutor().setCurrentUserID(currentUserID);
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

jsi::Value CommCoreModule::getCurrentUserID(jsi::Runtime &rt) {
  return createPromiseAsJSIValue(
      rt, [this](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [this, &innerRt, promise]() {
          std::string error;
          std::string result;
          try {
            result = DatabaseManager::getQueryExecutor().getCurrentUserID();
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

jsi::Value CommCoreModule::computeBackupKey(
    jsi::Runtime &rt,
    jsi::String password,
    jsi::String backupID) {
  std::string passwordStr = password.utf8(rt);
  std::string backupIDStr = backupID.utf8(rt);
  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=, &innerRt]() {
          std::string error;
          std::array<::std::uint8_t, 32> backupKey;
          try {
            backupKey = compute_backup_key(passwordStr, backupIDStr);
          } catch (const std::exception &e) {
            error = std::string{"Failed to compute backup key: "} + e.what();
          }

          this->jsInvoker_->invokeAsync([=, &innerRt]() {
            if (error.size()) {
              promise->reject(error);
              return;
            }
            auto size = backupKey.size();
            auto arrayBuffer =
                innerRt.global()
                    .getPropertyAsFunction(innerRt, "ArrayBuffer")
                    .callAsConstructor(innerRt, {static_cast<double>(size)})
                    .asObject(innerRt)
                    .getArrayBuffer(innerRt);
            auto bufferPtr = arrayBuffer.data(innerRt);
            memcpy(bufferPtr, backupKey.data(), size);
            promise->resolve(std::move(arrayBuffer));
          });
        };
        this->cryptoThread->scheduleTask(job);
      });
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
        taskType job =
            [this, promise, userIDStr, deviceIDStr, accessTokenStr]() {
              std::string error;
              try {
                CommSecureStore::set(CommSecureStore::userID, userIDStr);
                CommSecureStore::set(CommSecureStore::deviceID, deviceIDStr);
                CommSecureStore::set(
                    CommSecureStore::commServicesAccessToken, accessTokenStr);
                CommServicesAuthMetadataEmitter::sendAuthMetadataToJS(
                    accessTokenStr, userIDStr);
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

jsi::Value CommCoreModule::getCommServicesAuthMetadata(jsi::Runtime &rt) {
  return createPromiseAsJSIValue(
      rt, [this](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [this, &innerRt, promise]() {
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
        };
        GlobalDBSingleton::instance.scheduleOrRunCancellable(
            job, promise, this->jsInvoker_);
      });
}

jsi::Value CommCoreModule::setCommServicesAccessToken(
    jsi::Runtime &rt,
    jsi::String accessToken) {
  auto accessTokenStr{accessToken.utf8(rt)};
  return createPromiseAsJSIValue(
      rt,
      [this, accessTokenStr](
          jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [this, promise, accessTokenStr]() {
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
        };
        GlobalDBSingleton::instance.scheduleOrRunCancellable(
            job, promise, this->jsInvoker_);
      });
}

jsi::Value CommCoreModule::clearCommServicesAccessToken(jsi::Runtime &rt) {
  return createPromiseAsJSIValue(
      rt, [this](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [this, promise]() {
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
        };
        GlobalDBSingleton::instance.scheduleOrRunCancellable(
            job, promise, this->jsInvoker_);
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

jsi::Value
CommCoreModule::createNewBackup(jsi::Runtime &rt, jsi::String backupSecret) {
  std::string backupSecretStr = backupSecret.utf8(rt);
  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        this->cryptoThread->scheduleTask([=, &innerRt]() {
          std::string error;

          std::string backupID;
          try {
            backupID = crypto::Tools::generateRandomString(32);
          } catch (const std::exception &e) {
            error = "Failed to generate backupID";
          }

          std::string pickleKey;
          std::string pickledAccount;
          if (!error.size()) {
            try {
              pickleKey = crypto::Tools::generateRandomString(64);
              crypto::Persist persist =
                  this->cryptoModule->storeAsB64(pickleKey);
              pickledAccount =
                  std::string(persist.account.begin(), persist.account.end());
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
                currentID);
          } else {
            this->jsInvoker_->invokeAsync(
                [=, &innerRt]() { promise->reject(error); });
          }
        });
      });
}

jsi::Value
CommCoreModule::restoreBackup(jsi::Runtime &rt, jsi::String backupSecret) {
  std::string backupSecretStr = backupSecret.utf8(rt);
  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        auto currentID = RustPromiseManager::instance.addPromise(
            {promise, this->jsInvoker_, innerRt});
        ::restoreBackup(rust::string(backupSecretStr), currentID);
      });
}
} // namespace comm
