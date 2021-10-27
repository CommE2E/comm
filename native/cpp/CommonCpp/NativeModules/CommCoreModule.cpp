#include "CommCoreModule.h"
#include "DatabaseManager.h"
#include "Logger.h"
#include "MessageStoreOperations.h"
#include "ThreadStoreOperations.h"

#include <folly/Optional.h>

#include "../DatabaseManagers/entities/Media.h"

#include <ReactCommon/TurboModuleUtils.h>

namespace comm {

using namespace facebook::react;

jsi::Value CommCoreModule::getDraft(jsi::Runtime &rt, const jsi::String &key) {
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
        this->databaseThread->scheduleTask(job);
      });
}

jsi::Value
CommCoreModule::updateDraft(jsi::Runtime &rt, const jsi::Object &draft) {
  std::string keyStr = draft.getProperty(rt, "key").asString(rt).utf8(rt);
  std::string textStr = draft.getProperty(rt, "text").asString(rt).utf8(rt);
  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=, &innerRt]() {
          std::string error;
          try {
            DatabaseManager::getQueryExecutor().updateDraft(keyStr, textStr);
          } catch (std::system_error &e) {
            error = e.what();
          }
          this->jsInvoker_->invokeAsync([=, &innerRt]() {
            if (error.size()) {
              promise->reject(error);
            } else {
              promise->resolve(true);
            }
          });
        };
        this->databaseThread->scheduleTask(job);
      });
}

jsi::Value CommCoreModule::moveDraft(
    jsi::Runtime &rt,
    const jsi::String &oldKey,
    const jsi::String &newKey) {
  std::string oldKeyStr = oldKey.utf8(rt);
  std::string newKeyStr = newKey.utf8(rt);

  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=, &innerRt]() {
          std::string error;
          bool result = false;
          try {
            result = DatabaseManager::getQueryExecutor().moveDraft(
                oldKeyStr, newKeyStr);
          } catch (std::system_error &e) {
            error = e.what();
          }
          this->jsInvoker_->invokeAsync([=, &innerRt]() {
            if (error.size()) {
              promise->reject(error);
            } else {
              promise->resolve(result);
            }
          });
        };
        this->databaseThread->scheduleTask(job);
      });
}

jsi::Value CommCoreModule::getAllDrafts(jsi::Runtime &rt) {
  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=, &innerRt]() {
          std::string error;
          std::vector<Draft> draftsVector;
          size_t numDrafts;
          try {
            draftsVector = DatabaseManager::getQueryExecutor().getAllDrafts();
            numDrafts = count_if(
                draftsVector.begin(), draftsVector.end(), [](Draft draft) {
                  return !draft.text.empty();
                });
          } catch (std::system_error &e) {
            error = e.what();
          }
          this->jsInvoker_->invokeAsync([=, &innerRt]() {
            if (error.size()) {
              promise->reject(error);
              return;
            }
            jsi::Array jsiDrafts = jsi::Array(innerRt, numDrafts);

            size_t writeIndex = 0;
            for (Draft draft : draftsVector) {
              if (draft.text.empty()) {
                continue;
              }
              auto jsiDraft = jsi::Object(innerRt);
              jsiDraft.setProperty(innerRt, "key", draft.key);
              jsiDraft.setProperty(innerRt, "text", draft.text);
              jsiDrafts.setValueAtIndex(innerRt, writeIndex++, jsiDraft);
            }
            promise->resolve(std::move(jsiDrafts));
          });
        };
        this->databaseThread->scheduleTask(job);
      });
}

jsi::Value CommCoreModule::removeAllDrafts(jsi::Runtime &rt) {
  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=, &innerRt]() {
          std::string error;
          try {
            DatabaseManager::getQueryExecutor().removeAllDrafts();
          } catch (std::system_error &e) {
            error = e.what();
          }
          this->jsInvoker_->invokeAsync([=, &innerRt]() {
            if (error.size()) {
              promise->reject(error);
              return;
            }
            promise->resolve(jsi::Value::undefined());
          });
        };
        this->databaseThread->scheduleTask(job);
      });
}

jsi::Value CommCoreModule::getAllMessages(jsi::Runtime &rt) {
  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=, &innerRt]() {
          std::string error;
          std::vector<Message> messagesVector;
          size_t numMessages;
          try {
            messagesVector =
                DatabaseManager::getQueryExecutor().getAllMessages();
            numMessages = messagesVector.size();
          } catch (std::system_error &e) {
            error = e.what();
          }
          auto messagesVectorPtr =
              std::make_shared<std::vector<Message>>(std::move(messagesVector));
          this->jsInvoker_->invokeAsync(
              [messagesVectorPtr, &innerRt, promise, error, numMessages]() {
                if (error.size()) {
                  promise->reject(error);
                  return;
                }
                jsi::Array jsiMessages = jsi::Array(innerRt, numMessages);
                size_t writeIndex = 0;
                for (const Message &message : *messagesVectorPtr) {
                  auto jsiMessage = jsi::Object(innerRt);
                  jsiMessage.setProperty(innerRt, "id", message.id);

                  if (message.local_id) {
                    auto local_id = message.local_id.get();
                    jsiMessage.setProperty(innerRt, "local_id", *local_id);
                  }

                  jsiMessage.setProperty(innerRt, "thread", message.thread);
                  jsiMessage.setProperty(innerRt, "user", message.user);
                  jsiMessage.setProperty(
                      innerRt, "type", std::to_string(message.type));

                  if (message.future_type) {
                    auto future_type = message.future_type.get();
                    jsiMessage.setProperty(
                        innerRt, "future_type", std::to_string(*future_type));
                  }

                  if (message.content) {
                    auto content = message.content.get();
                    jsiMessage.setProperty(innerRt, "content", *content);
                  }

                  jsiMessage.setProperty(
                      innerRt, "time", std::to_string(message.time));
                  jsiMessages.setValueAtIndex(
                      innerRt, writeIndex++, jsiMessage);
                }
                promise->resolve(std::move(jsiMessages));
              });
        };
        this->databaseThread->scheduleTask(job);
      });
}

#define REKEY_OPERATION "rekey"
#define REMOVE_OPERATION "remove"
#define REPLACE_OPERATION "replace"
#define REMOVE_MSGS_FOR_THREADS_OPERATION "remove_messages_for_threads"
#define REMOVE_ALL_OPERATION "remove_all"

jsi::Value CommCoreModule::processMessageStoreOperations(
    jsi::Runtime &rt,
    const jsi::Array &operations) {

  std::vector<std::shared_ptr<MessageStoreOperationBase>> messageStoreOps;

  for (auto idx = 0; idx < operations.size(rt); idx++) {
    auto op = operations.getValueAtIndex(rt, idx).asObject(rt);
    auto op_type = op.getProperty(rt, "type").asString(rt).utf8(rt);

    if (op_type == REMOVE_OPERATION) {
      std::vector<std::string> removed_msg_ids;
      auto payload_obj = op.getProperty(rt, "payload").asObject(rt);
      auto msg_ids =
          payload_obj.getProperty(rt, "ids").asObject(rt).asArray(rt);
      for (auto msg_idx = 0; msg_idx < msg_ids.size(rt); msg_idx++) {
        removed_msg_ids.push_back(
            msg_ids.getValueAtIndex(rt, msg_idx).asString(rt).utf8(rt));
      }
      messageStoreOps.push_back(std::make_shared<RemoveMessagesOperation>(
          std::move(removed_msg_ids)));

    } else if (op_type == REMOVE_MSGS_FOR_THREADS_OPERATION) {
      std::vector<std::string> threads_to_remove_msgs_from;
      auto payload_obj = op.getProperty(rt, "payload").asObject(rt);
      auto thread_ids =
          payload_obj.getProperty(rt, "threadIDs").asObject(rt).asArray(rt);
      for (auto thread_idx = 0; thread_idx < thread_ids.size(rt);
           thread_idx++) {
        threads_to_remove_msgs_from.push_back(
            thread_ids.getValueAtIndex(rt, thread_idx).asString(rt).utf8(rt));
      }
      messageStoreOps.push_back(
          std::make_shared<RemoveMessagesForThreadsOperation>(
              std::move(threads_to_remove_msgs_from)));
    } else if (op_type == REPLACE_OPERATION) {
      auto msg_obj = op.getProperty(rt, "payload").asObject(rt);
      auto msg_id = msg_obj.getProperty(rt, "id").asString(rt).utf8(rt);

      auto maybe_local_id = msg_obj.getProperty(rt, "local_id");
      auto local_id = maybe_local_id.isString()
          ? std::make_unique<std::string>(maybe_local_id.asString(rt).utf8(rt))
          : nullptr;

      auto thread = msg_obj.getProperty(rt, "thread").asString(rt).utf8(rt);
      auto user = msg_obj.getProperty(rt, "user").asString(rt).utf8(rt);
      auto type =
          std::stoi(msg_obj.getProperty(rt, "type").asString(rt).utf8(rt));

      auto maybe_future_type = msg_obj.getProperty(rt, "future_type");
      auto future_type = maybe_future_type.isString()
          ? std::make_unique<int>(
                std::stoi(maybe_future_type.asString(rt).utf8(rt)))
          : nullptr;

      auto maybe_content = msg_obj.getProperty(rt, "content");
      auto content = maybe_content.isString()
          ? std::make_unique<std::string>(maybe_content.asString(rt).utf8(rt))
          : nullptr;

      auto time =
          std::stoll(msg_obj.getProperty(rt, "time").asString(rt).utf8(rt));
      Message message{
          msg_id,
          std::move(local_id),
          thread,
          user,
          type,
          std::move(future_type),
          std::move(content),
          time};

      std::vector<Media> media_vector;
      if (msg_obj.getProperty(rt, "media_infos").isObject()) {
        auto media_infos =
            msg_obj.getProperty(rt, "media_infos").asObject(rt).asArray(rt);
        for (auto media_info_idx = 0; media_info_idx < media_infos.size(rt);
             media_info_idx++) {
          auto media_info =
              media_infos.getValueAtIndex(rt, media_info_idx).asObject(rt);
          auto media_id =
              media_info.getProperty(rt, "id").asString(rt).utf8(rt);
          auto media_uri =
              media_info.getProperty(rt, "uri").asString(rt).utf8(rt);
          auto media_type =
              media_info.getProperty(rt, "type").asString(rt).utf8(rt);
          auto media_extras =
              media_info.getProperty(rt, "extras").asString(rt).utf8(rt);

          Media media{
              media_id, msg_id, thread, media_uri, media_type, media_extras};
          media_vector.push_back(media);
        }
      }

      messageStoreOps.push_back(std::make_shared<ReplaceMessageOperation>(
          std::move(message), std::move(media_vector)));
    } else if (op_type == REKEY_OPERATION) {
      auto rekey_payload = op.getProperty(rt, "payload").asObject(rt);
      auto from = rekey_payload.getProperty(rt, "from").asString(rt).utf8(rt);
      auto to = rekey_payload.getProperty(rt, "to").asString(rt).utf8(rt);
      messageStoreOps.push_back(std::make_shared<RekeyMessageOperation>(
          std::move(from), std::move(to)));
    } else if (op_type == REMOVE_ALL_OPERATION) {
      messageStoreOps.push_back(std::make_shared<RemoveAllMessagesOperation>());
    } else {
      return createPromiseAsJSIValue(
          rt,
          [this,
           op_type](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
            this->jsInvoker_->invokeAsync([promise, &innerRt, op_type]() {
              promise->reject(
                  std::string{"unsupported operation: "}.append(op_type));
            });
          });
    }
  }

  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=, &innerRt]() {
          std::string error;
          try {
            DatabaseManager::getQueryExecutor().beginTransaction();
            for (const auto &operation : messageStoreOps) {
              operation->execute();
            }
            DatabaseManager::getQueryExecutor().commitTransaction();
          } catch (std::system_error &e) {
            error = e.what();
            DatabaseManager::getQueryExecutor().rollbackTransaction();
          }
          this->jsInvoker_->invokeAsync([=, &innerRt]() {
            if (error.size()) {
              promise->reject(error);
            } else {
              promise->resolve(jsi::Value::undefined());
            }
          });
        };
        this->databaseThread->scheduleTask(job);
      });
}

jsi::Value CommCoreModule::getAllThreads(jsi::Runtime &rt) {
  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        this->databaseThread->scheduleTask([=, &innerRt]() {
          std::string error;
          std::vector<Thread> threadsVector;
          size_t numThreads;
          try {
            threadsVector = DatabaseManager::getQueryExecutor().getAllThreads();
            numThreads = threadsVector.size();
          } catch (std::system_error &e) {
            error = e.what();
          }
          auto threadsVectorPtr =
              std::make_shared<std::vector<Thread>>(std::move(threadsVector));
          this->jsInvoker_->invokeAsync([=, &innerRt]() {
            if (error.size()) {
              promise->reject(error);
              return;
            }

            jsi::Array jsiThreads = jsi::Array(innerRt, numThreads);
            size_t writeIdx = 0;
            for (const Thread &thread : *threadsVectorPtr) {
              jsi::Object jsiThread = jsi::Object(innerRt);
              jsiThread.setProperty(innerRt, "id", thread.id);
              jsiThread.setProperty(innerRt, "type", thread.type);
              jsiThread.setProperty(
                  innerRt,
                  "name",
                  thread.name
                      ? jsi::String::createFromUtf8(innerRt, *thread.name)
                      : jsi::Value::null());
              jsiThread.setProperty(
                  innerRt,
                  "description",
                  thread.description ? jsi::String::createFromUtf8(
                                           innerRt, *thread.description)
                                     : jsi::Value::null());
              jsiThread.setProperty(innerRt, "color", thread.color);
              jsiThread.setProperty(
                  innerRt,
                  "creationTime",
                  std::to_string(thread.creation_time));
              jsiThread.setProperty(
                  innerRt,
                  "parentThreadID",
                  thread.parent_thread_id
                      ? jsi::String::createFromUtf8(
                            innerRt, *thread.parent_thread_id)
                      : jsi::Value::null());
              jsiThread.setProperty(
                  innerRt,
                  "containingThreadID",
                  thread.containing_thread_id
                      ? jsi::String::createFromUtf8(
                            innerRt, *thread.containing_thread_id)
                      : jsi::Value::null());
              jsiThread.setProperty(
                  innerRt,
                  "community",
                  thread.community
                      ? jsi::String::createFromUtf8(innerRt, *thread.community)
                      : jsi::Value::null());
              jsiThread.setProperty(innerRt, "members", thread.members);
              jsiThread.setProperty(innerRt, "roles", thread.roles);
              jsiThread.setProperty(
                  innerRt, "currentUser", thread.current_user);
              jsiThread.setProperty(
                  innerRt,
                  "sourceMessageID",
                  thread.source_message_id
                      ? jsi::String::createFromUtf8(
                            innerRt, *thread.source_message_id)
                      : jsi::Value::null());
              jsiThread.setProperty(
                  innerRt, "repliesCount", thread.replies_count);

              jsiThreads.setValueAtIndex(innerRt, writeIdx++, jsiThread);
            }
            promise->resolve(std::move(jsiThreads));
          });
        });
      });
};

jsi::Value CommCoreModule::processThreadStoreOperations(
    jsi::Runtime &rt,
    const jsi::Array &operations) {
  std::vector<std::unique_ptr<ThreadStoreOperationBase>> threadStoreOps;

  std::string operationsError;
  for (size_t idx = 0; idx < operations.size(rt); idx++) {
    jsi::Object op = operations.getValueAtIndex(rt, idx).asObject(rt);
    std::string opType = op.getProperty(rt, "type").asString(rt).utf8(rt);

    if (opType == REMOVE_OPERATION) {
      std::vector<std::string> threadIDsToRemove;
      jsi::Object payloadObj = op.getProperty(rt, "payload").asObject(rt);
      jsi::Array threadIDs =
          payloadObj.getProperty(rt, "ids").asObject(rt).asArray(rt);
      for (int threadIdx = 0; threadIdx < threadIDs.size(rt); threadIdx++) {
        threadIDsToRemove.push_back(
            threadIDs.getValueAtIndex(rt, threadIdx).asString(rt).utf8(rt));
      }
      threadStoreOps.push_back(std::make_unique<RemoveThreadsOperation>(
          std::move(threadIDsToRemove)));
    } else if (opType == REMOVE_ALL_OPERATION) {
      threadStoreOps.push_back(std::make_unique<RemoveAllThreadsOperation>());
    } else if (opType == REPLACE_OPERATION) {
      jsi::Object threadObj = op.getProperty(rt, "payload").asObject(rt);
      std::string threadID =
          threadObj.getProperty(rt, "id").asString(rt).utf8(rt);
      int type = std::lround(threadObj.getProperty(rt, "type").asNumber());
      jsi::Value maybeName = threadObj.getProperty(rt, "name");
      std::unique_ptr<std::string> name = maybeName.isString()
          ? std::make_unique<std::string>(maybeName.asString(rt).utf8(rt))
          : nullptr;

      jsi::Value maybeDescription = threadObj.getProperty(rt, "description");
      std::unique_ptr<std::string> description = maybeDescription.isString()
          ? std::make_unique<std::string>(
                maybeDescription.asString(rt).utf8(rt))
          : nullptr;

      std::string color =
          threadObj.getProperty(rt, "color").asString(rt).utf8(rt);
      int64_t creationTime = std::stoll(
          threadObj.getProperty(rt, "creationTime").asString(rt).utf8(rt));

      jsi::Value maybeParentThreadID =
          threadObj.getProperty(rt, "parentThreadID");
      std::unique_ptr<std::string> parentThreadID =
          maybeParentThreadID.isString()
          ? std::make_unique<std::string>(
                maybeParentThreadID.asString(rt).utf8(rt))
          : nullptr;

      jsi::Value maybeContainingThreadID =
          threadObj.getProperty(rt, "containingThreadID");
      std::unique_ptr<std::string> containingThreadID =
          maybeContainingThreadID.isString()
          ? std::make_unique<std::string>(
                maybeContainingThreadID.asString(rt).utf8(rt))
          : nullptr;

      jsi::Value maybeCommunity = threadObj.getProperty(rt, "community");
      std::unique_ptr<std::string> community = maybeCommunity.isString()
          ? std::make_unique<std::string>(maybeCommunity.asString(rt).utf8(rt))
          : nullptr;

      std::string members =
          threadObj.getProperty(rt, "members").asString(rt).utf8(rt);
      std::string roles =
          threadObj.getProperty(rt, "roles").asString(rt).utf8(rt);
      std::string currentUser =
          threadObj.getProperty(rt, "currentUser").asString(rt).utf8(rt);

      jsi::Value maybeSourceMessageID =
          threadObj.getProperty(rt, "sourceMessageID");
      std::unique_ptr<std::string> sourceMessageID =
          maybeSourceMessageID.isString()
          ? std::make_unique<std::string>(
                maybeSourceMessageID.asString(rt).utf8(rt))
          : nullptr;

      int repliesCount =
          std::lround(threadObj.getProperty(rt, "repliesCount").asNumber());
      Thread thread{
          threadID,
          type,
          std::move(name),
          std::move(description),
          color,
          creationTime,
          std::move(parentThreadID),
          std::move(containingThreadID),
          std::move(community),
          members,
          roles,
          currentUser,
          std::move(sourceMessageID),
          repliesCount};

      threadStoreOps.push_back(
          std::make_unique<ReplaceThreadOperation>(std::move(thread)));
    } else {
      operationsError = "unsupported operation:" + opType;
    }
  };
  auto threadStoreOpsPtr =
      std::make_shared<std::vector<std::unique_ptr<ThreadStoreOperationBase>>>(
          std::move(threadStoreOps));
  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        this->databaseThread->scheduleTask([=, &innerRt]() {
          std::string error = operationsError;
          if (!error.size()) {
            try {
              DatabaseManager::getQueryExecutor().beginTransaction();
              for (const auto &operation : *threadStoreOpsPtr) {
                operation->execute();
              }
              DatabaseManager::getQueryExecutor().commitTransaction();
            } catch (std::system_error &e) {
              error = e.what();
              DatabaseManager::getQueryExecutor().rollbackTransaction();
            }
          }
          this->jsInvoker_->invokeAsync([=, &innerRt]() {
            if (error.size()) {
              promise->reject(error);
            } else {
              promise->resolve(jsi::Value::undefined());
            }
          });
        });
      });
}

jsi::Value CommCoreModule::initializeCryptoAccount(
    jsi::Runtime &rt,
    const jsi::String &userId) {
  std::string userIdStr = userId.utf8(rt);
  folly::Optional<std::string> storedSecretKey =
      this->secureStore.get(this->secureStoreAccountDataKey);
  if (!storedSecretKey.hasValue()) {
    storedSecretKey = crypto::Tools::generateRandomString(64);
    this->secureStore.set(
        this->secureStoreAccountDataKey, storedSecretKey.value());
  }

  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        this->databaseThread->scheduleTask([=, &innerRt]() {
          crypto::Persist persist;
          std::string error;
          try {
            folly::Optional<std::string> accountData =
                DatabaseManager::getQueryExecutor().getOlmPersistAccountData();
            if (accountData.hasValue()) {
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

          this->cryptoThread->scheduleTask([=, &innerRt]() {
            std::string error;
            this->cryptoModule.reset(new crypto::CryptoModule(
                userIdStr, storedSecretKey.value(), persist));
            if (persist.isEmpty()) {
              crypto::Persist newPersist =
                  this->cryptoModule->storeAsB64(storedSecretKey.value());
              this->databaseThread->scheduleTask([=, &innerRt]() {
                std::string error;
                try {
                  DatabaseManager::getQueryExecutor().storeOlmPersistData(
                      newPersist);
                } catch (std::system_error &e) {
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

            } else {
              this->cryptoModule->restoreFromB64(
                  storedSecretKey.value(), persist);
              this->jsInvoker_->invokeAsync([=, &innerRt]() {
                if (error.size()) {
                  promise->reject(error);
                  return;
                }
                promise->resolve(jsi::Value::undefined());
              });
            }
          });
        });
      });
}

void CommCoreModule::initializeNetworkModule(
    const std::string &userId,
    const std::string &deviceToken,
    const std::string &hostname) {
  std::string host = (hostname.size() == 0) ? "localhost" : hostname;
  // initialize network module
  // this is going to differ depending on a device
  // 10.0.2.2 for android emulator
  // 192.168.x.x for a physical device etc
  const std::shared_ptr<grpc::ChannelCredentials> credentials =
      (host.substr(0, 5) == "https")
      ? grpc::SslCredentials(grpc::SslCredentialsOptions())
      : grpc::InsecureChannelCredentials();
  this->networkClient.reset(
      new network::Client(host, "50051", credentials, userId, deviceToken));
}

jsi::Value CommCoreModule::getUserPublicKey(jsi::Runtime &rt) {
  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=, &innerRt]() {
          std::string error;
          std::string result;
          if (this->cryptoModule == nullptr) {
            error = "user has not been initialized";
          } else {
            result = this->cryptoModule->getIdentityKeys();
          }
          this->jsInvoker_->invokeAsync([=, &innerRt]() {
            if (error.size()) {
              promise->reject(error);
              return;
            }
            promise->resolve(jsi::String::createFromUtf8(innerRt, result));
          });
        };
        this->cryptoThread->scheduleTask(job);
      });
}

jsi::Value CommCoreModule::getUserOneTimeKeys(jsi::Runtime &rt) {
  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=, &innerRt]() {
          std::string error;
          std::string result;
          if (this->cryptoModule == nullptr) {
            error = "user has not been initialized";
          } else {
            result = this->cryptoModule->getOneTimeKeys();
          }
          this->jsInvoker_->invokeAsync([=, &innerRt]() {
            if (error.size()) {
              promise->reject(error);
              return;
            }
            promise->resolve(jsi::String::createFromUtf8(innerRt, result));
          });
        };
        this->cryptoThread->scheduleTask(job);
      });
}

CommCoreModule::CommCoreModule(
    std::shared_ptr<facebook::react::CallInvoker> jsInvoker)
    : facebook::react::CommCoreModuleSchemaCxxSpecJSI(jsInvoker),
      databaseThread(std::make_unique<WorkerThread>("database")),
      cryptoThread(std::make_unique<WorkerThread>("crypto")),
      networkThread(std::make_unique<WorkerThread>("network")){};

} // namespace comm
