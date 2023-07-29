#include "CommCoreModule.h"
#include "../CryptoTools/DeviceID.h"
#include "../Notifications/BackgroundDataStorage/NotificationsCryptoModule.h"
#include "BaseDataStore.h"
#include "DatabaseManager.h"
#include "DraftStoreOperations.h"
#include "InternalModules/GlobalDBSingleton.h"
#include "InternalModules/RustPromiseManager.h"
#include "MessageStoreOperations.h"
#include "NativeModuleUtils.h"
#include "ReportStoreOperations.h"
#include "TerminateApp.h"
#include "ThreadStoreOperations.h"
#include "lib.rs.h"

#include <ReactCommon/TurboModuleUtils.h>
#include <folly/dynamic.h>
#include <folly/json.h>
#include <future>

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

jsi::Array parseDBReportStore(
    jsi::Runtime &rt,
    std::shared_ptr<std::vector<Report>> reportStoreVectorPtr) {
  size_t numReports = reportStoreVectorPtr->size();
  jsi::Array jsiReports = jsi::Array(rt, numReports);
  size_t writeIdx = 0;

  for (const Report &report : *reportStoreVectorPtr) {
    jsi::Object jsiReport = jsi::Object(rt);
    jsiReport.setProperty(rt, "id", report.id);
    jsiReport.setProperty(rt, "report", report.report);
    jsiReports.setValueAtIndex(rt, writeIdx++, jsiReport);
  }
  return jsiReports;
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
          try {
            draftsVector = DatabaseManager::getQueryExecutor().getAllDrafts();
            messagesVector =
                DatabaseManager::getQueryExecutor().getAllMessages();
            threadsVector = DatabaseManager::getQueryExecutor().getAllThreads();
            messageStoreThreadsVector =
                DatabaseManager::getQueryExecutor().getAllMessageStoreThreads();
            reportStoreVector =
                DatabaseManager::getQueryExecutor().getAllReports();
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
          this->jsInvoker_->invokeAsync([&innerRt,
                                         draftsVectorPtr,
                                         messagesVectorPtr,
                                         threadsVectorPtr,
                                         messageStoreThreadsVectorPtr,
                                         reportStoreVectorPtr,
                                         error,
                                         promise,
                                         draftStore = this->draftStore,
                                         threadStore = this->threadStore,
                                         messageStore = this->messageStore]() {
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
                parseDBReportStore(innerRt, reportStoreVectorPtr);

            auto jsiClientDBStore = jsi::Object(innerRt);
            jsiClientDBStore.setProperty(innerRt, "messages", jsiMessages);
            jsiClientDBStore.setProperty(innerRt, "threads", jsiThreads);
            jsiClientDBStore.setProperty(innerRt, "drafts", jsiDrafts);
            jsiClientDBStore.setProperty(
                innerRt, "messageStoreThreads", jsiMessageStoreThreads);
            jsiClientDBStore.setProperty(innerRt, "reports", jsiReportStore);

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
  return this->draftStore.processStoreOperations(
      rt, std::move(operations), this->jsInvoker_);
}

jsi::Value CommCoreModule::processMessageStoreOperations(
    jsi::Runtime &rt,
    jsi::Array operations) {
  return this->messageStore.processStoreOperations(
      rt, std::move(operations), this->jsInvoker_);
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
  return this->threadStore.processStoreOperations(
      rt, std::move(operations), this->jsInvoker_);
}

void CommCoreModule::processThreadStoreOperationsSync(
    jsi::Runtime &rt,
    jsi::Array operations) {
  this->threadStore.processStoreOperationsSync(rt, std::move(operations));
}

const std::string REPLACE_REPORT_OPERATION = "replace_report";
const std::string REMOVE_REPORTS_OPERATION = "remove_reports";
const std::string REMOVE_ALL_REPORTS_OPERATION = "remove_all_reports";

std::vector<std::unique_ptr<ReportStoreOperationBase>>
createReportStoreOperations(jsi::Runtime &rt, const jsi::Array &operations) {
  std::vector<std::unique_ptr<ReportStoreOperationBase>> reportStoreOps;
  for (auto idx = 0; idx < operations.size(rt); idx++) {
    auto op = operations.getValueAtIndex(rt, idx).asObject(rt);
    auto op_type = op.getProperty(rt, "type").asString(rt).utf8(rt);

    if (op_type == REMOVE_ALL_REPORTS_OPERATION) {
      reportStoreOps.push_back(std::make_unique<RemoveAllReportsOperation>());
      continue;
    }

    auto payload_obj = op.getProperty(rt, "payload").asObject(rt);
    if (op_type == REPLACE_REPORT_OPERATION) {
      reportStoreOps.push_back(
          std::make_unique<ReplaceReportOperation>(rt, payload_obj));
    } else if (op_type == REMOVE_REPORTS_OPERATION) {
      reportStoreOps.push_back(
          std::make_unique<RemoveReportsOperation>(rt, payload_obj));
    } else {
      throw std::runtime_error{"unsupported operation: " + op_type};
    }
  }
  return reportStoreOps;
}

jsi::Value CommCoreModule::processReportStoreOperations(
    jsi::Runtime &rt,
    jsi::Array operations) {
  std::string createOperationsError;
  std::shared_ptr<std::vector<std::unique_ptr<ReportStoreOperationBase>>>
      reportStoreOpsPtr;
  try {
    auto reportStoreOps = createReportStoreOperations(rt, operations);
    reportStoreOpsPtr = std::make_shared<
        std::vector<std::unique_ptr<ReportStoreOperationBase>>>(
        std::move(reportStoreOps));
  } catch (std::runtime_error &e) {
    createOperationsError = e.what();
  }

  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=]() {
          std::string error = createOperationsError;

          if (!error.size()) {
            try {
              DatabaseManager::getQueryExecutor().beginTransaction();
              for (const auto &operation : *reportStoreOpsPtr) {
                operation->execute();
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

void CommCoreModule::processReportStoreOperationsSync(
    jsi::Runtime &rt,
    jsi::Array operations) {
  std::vector<std::unique_ptr<ReportStoreOperationBase>> reportStoreOps;

  try {
    reportStoreOps = createReportStoreOperations(rt, operations);
  } catch (const std::exception &e) {
    throw jsi::JSError(rt, e.what());
  }

  NativeModuleUtils::runSyncOrThrowJSError<void>(rt, [&reportStoreOps]() {
    try {
      DatabaseManager::getQueryExecutor().beginTransaction();
      for (const auto &operation : reportStoreOps) {
        operation->execute();
      }
      DatabaseManager::getQueryExecutor().commitTransaction();
    } catch (const std::exception &e) {
      DatabaseManager::getQueryExecutor().rollbackTransaction();
      throw e;
    }
  });
}

void CommCoreModule::terminate(jsi::Runtime &rt) {
  TerminateApp::terminate();
}

jsi::Value CommCoreModule::initializeCryptoAccount(jsi::Runtime &rt) {
  folly::Optional<std::string> storedSecretKey =
      this->secureStore.get(this->secureStoreAccountDataKey);
  if (!storedSecretKey.hasValue()) {
    storedSecretKey = crypto::Tools::generateRandomString(64);
    this->secureStore.set(
        this->secureStoreAccountDataKey, storedSecretKey.value());
  }

  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=]() {
          crypto::Persist persist;
          std::string error;
          try {
            std::optional<std::string> accountData =
                DatabaseManager::getQueryExecutor().getOlmPersistAccountData();
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

jsi::Value CommCoreModule::getPrimaryOneTimeKeys(
    jsi::Runtime &rt,
    double oneTimeKeysAmount) {
  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=, &innerRt]() {
          std::string error;
          std::string result;
          if (this->cryptoModule == nullptr) {
            error = "user has not been initialized";
          } else {
            result = this->cryptoModule->getOneTimeKeys(oneTimeKeysAmount);
          }
          this->jsInvoker_->invokeAsync([=, &innerRt]() {
            if (error.size()) {
              promise->reject(error);
              return;
            }
            promise->resolve(parseOLMOneTimeKeys(innerRt, result));
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
    jsi::String oneTimeKeys) {
  auto identityKeysCpp{identityKeys.utf8(rt)};
  auto prekeyCpp{prekey.utf8(rt)};
  auto prekeySignatureCpp{prekeySignature.utf8(rt)};
  auto oneTimeKeysCpp{oneTimeKeys.utf8(rt)};
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
                oneTimeKeysCpp,
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

CommCoreModule::CommCoreModule(
    std::shared_ptr<facebook::react::CallInvoker> jsInvoker)
    : facebook::react::CommCoreModuleSchemaCxxSpecJSI(jsInvoker),
      cryptoThread(std::make_unique<WorkerThread>("crypto")) {
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

jsi::Value
CommCoreModule::setDeviceID(jsi::Runtime &rt, jsi::String deviceType) {
  std::string type = deviceType.utf8(rt);
  std::string deviceID;
  std::string deviceIDGenerationError;

  try {
    deviceID = DeviceIDGenerator::generateDeviceID(type);
  } catch (std::invalid_argument &e) {
    deviceIDGenerationError =
        "setDeviceID: incorrect function argument. Must be one of: KEYSERVER, "
        "WEB, MOBILE.";
  }

  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [this,
                        &innerRt,
                        promise,
                        deviceIDGenerationError,
                        deviceID]() {
          std::string error = deviceIDGenerationError;
          if (!error.size()) {
            try {
              DatabaseManager::getQueryExecutor().setDeviceID(deviceID);
            } catch (const std::exception &e) {
              error = e.what();
            }
          }
          this->jsInvoker_->invokeAsync([&innerRt, promise, error, deviceID]() {
            if (error.size()) {
              promise->reject(error);
            } else {
              promise->resolve(jsi::String::createFromUtf8(innerRt, deviceID));
            }
          });
        };
        GlobalDBSingleton::instance.scheduleOrRunCancellable(
            job, promise, this->jsInvoker_);
      });
}

jsi::Value CommCoreModule::getDeviceID(jsi::Runtime &rt) {
  return createPromiseAsJSIValue(
      rt, [this](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [this, &innerRt, promise]() {
          std::string error;
          std::string result;
          try {
            result = DatabaseManager::getQueryExecutor().getDeviceID();
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

jsi::Value CommCoreModule::generateNonce(jsi::Runtime &rt) {
  return createPromiseAsJSIValue(
      rt, [this](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        std::string error;
        try {
          auto currentID = RustPromiseManager::instance.addPromise(
              promise, this->jsInvoker_, innerRt);
          identityGenerateNonce(currentID);
        } catch (const std::exception &e) {
          error = e.what();
        };
      });
}

jsi::Value CommCoreModule::registerUser(
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
  return createPromiseAsJSIValue(
      rt,
      [this,
       &username,
       &password,
       &keyPayload,
       &keyPayloadSignature,
       &contentPrekey,
       &contentPrekeySignature,
       &notifPrekey,
       &notifPrekeySignature,
       &contentOneTimeKeys,
       &notifOneTimeKeys](
          jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        std::string error;
        try {
          auto currentID = RustPromiseManager::instance.addPromise(
              promise, this->jsInvoker_, innerRt);
          identityRegisterUser(
              jsiStringToRustString(username, innerRt),
              jsiStringToRustString(password, innerRt),
              jsiStringToRustString(keyPayload, innerRt),
              jsiStringToRustString(keyPayloadSignature, innerRt),
              jsiStringToRustString(contentPrekey, innerRt),
              jsiStringToRustString(contentPrekeySignature, innerRt),
              jsiStringToRustString(notifPrekey, innerRt),
              jsiStringToRustString(notifPrekeySignature, innerRt),
              jsiStringArrayToRustVec(contentOneTimeKeys, innerRt),
              jsiStringArrayToRustVec(notifOneTimeKeys, innerRt),
              currentID);
        } catch (const std::exception &e) {
          error = e.what();
        };
      });
}

jsi::Value CommCoreModule::loginPasswordUser(
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
  return createPromiseAsJSIValue(
      rt,
      [this,
       &username,
       &password,
       &keyPayload,
       &keyPayloadSignature,
       &contentPrekey,
       &contentPrekeySignature,
       &notifPrekey,
       &notifPrekeySignature,
       &contentOneTimeKeys,
       &notifOneTimeKeys](
          jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        std::string error;
        try {
          auto currentID = RustPromiseManager::instance.addPromise(
              promise, this->jsInvoker_, innerRt);
          identityLoginPasswordUser(
              jsiStringToRustString(username, innerRt),
              jsiStringToRustString(password, innerRt),
              jsiStringToRustString(keyPayload, innerRt),
              jsiStringToRustString(keyPayloadSignature, innerRt),
              jsiStringToRustString(contentPrekey, innerRt),
              jsiStringToRustString(contentPrekeySignature, innerRt),
              jsiStringToRustString(notifPrekey, innerRt),
              jsiStringToRustString(notifPrekeySignature, innerRt),
              jsiStringArrayToRustVec(contentOneTimeKeys, innerRt),
              jsiStringArrayToRustVec(notifOneTimeKeys, innerRt),
              currentID);
        } catch (const std::exception &e) {
          error = e.what();
        };
      });
}

jsi::Value CommCoreModule::loginWalletUser(
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
    jsi::String socialProof) {
  return createPromiseAsJSIValue(
      rt,
      [this,
       &siweMessage,
       &siweSignature,
       &keyPayload,
       &keyPayloadSignature,
       &contentPrekey,
       &contentPrekeySignature,
       &notifPrekey,
       &notifPrekeySignature,
       &contentOneTimeKeys,
       &notifOneTimeKeys,
       &socialProof](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        std::string error;
        try {
          auto currentID = RustPromiseManager::instance.addPromise(
              promise, this->jsInvoker_, innerRt);
          identityLoginWalletUser(
              jsiStringToRustString(siweMessage, innerRt),
              jsiStringToRustString(siweSignature, innerRt),
              jsiStringToRustString(keyPayload, innerRt),
              jsiStringToRustString(keyPayloadSignature, innerRt),
              jsiStringToRustString(contentPrekey, innerRt),
              jsiStringToRustString(contentPrekeySignature, innerRt),
              jsiStringToRustString(notifPrekey, innerRt),
              jsiStringToRustString(notifPrekeySignature, innerRt),
              jsiStringArrayToRustVec(contentOneTimeKeys, innerRt),
              jsiStringArrayToRustVec(notifOneTimeKeys, innerRt),
              jsiStringToRustString(socialProof, innerRt),
              currentID);
        } catch (const std::exception &e) {
          error = e.what();
        };
      });
}

} // namespace comm
