#include "CommCoreModule.h"
#include "../CryptoTools/DeviceID.h"
#include "../Notifications/BackgroundDataStorage/NotificationsCryptoModule.h"
#include "DatabaseManager.h"
#include "DraftStoreOperations.h"
#include "InternalModules/GlobalDBSingleton.h"
#include "InternalModules/RustPromiseManager.h"
#include "MessageStoreOperations.h"
#include "TerminateApp.h"
#include "ThreadStoreOperations.h"
#include "lib.rs.h"

#include <ReactCommon/TurboModuleUtils.h>
#include <folly/dynamic.h>
#include <folly/json.h>
#include <future>

namespace comm {

using namespace facebook::react;

template <class T>
T CommCoreModule::runSyncOrThrowJSError(
    jsi::Runtime &rt,
    std::function<T()> task) {
  std::promise<T> promise;
  GlobalDBSingleton::instance.scheduleOrRunCancellable([&promise, &task]() {
    try {
      if constexpr (std::is_void<T>::value) {
        task();
        promise.set_value();
      } else {
        promise.set_value(task());
      }
    } catch (const std::exception &e) {
      promise.set_exception(std::make_exception_ptr(e));
    }
  });
  // We cannot instantiate JSError on database thread, so
  // on the main thread we re-throw C++ error, catch it and
  // transform to informative JSError on the main thread
  try {
    return promise.get_future().get();
  } catch (const std::exception &e) {
    throw jsi::JSError(rt, e.what());
  }
}

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

jsi::Array parseDBDrafts(
    jsi::Runtime &rt,
    std::shared_ptr<std::vector<Draft>> draftsVectorPtr) {
  size_t numDrafts = count_if(
      draftsVectorPtr->begin(), draftsVectorPtr->end(), [](Draft draft) {
        return !draft.text.empty();
      });
  jsi::Array jsiDrafts = jsi::Array(rt, numDrafts);

  size_t writeIndex = 0;
  for (Draft draft : *draftsVectorPtr) {
    if (draft.text.empty()) {
      continue;
    }
    auto jsiDraft = jsi::Object(rt);
    jsiDraft.setProperty(rt, "key", draft.key);
    jsiDraft.setProperty(rt, "text", draft.text);
    jsiDrafts.setValueAtIndex(rt, writeIndex++, jsiDraft);
  }
  return jsiDrafts;
}

jsi::Array parseDBMessages(
    jsi::Runtime &rt,
    std::shared_ptr<std::vector<std::pair<Message, std::vector<Media>>>>
        messagesVectorPtr) {
  size_t numMessages = messagesVectorPtr->size();
  jsi::Array jsiMessages = jsi::Array(rt, numMessages);
  size_t writeIndex = 0;
  for (const auto &[message, media] : *messagesVectorPtr) {
    auto jsiMessage = jsi::Object(rt);
    jsiMessage.setProperty(rt, "id", message.id);

    if (message.local_id) {
      auto local_id = message.local_id.get();
      jsiMessage.setProperty(rt, "local_id", *local_id);
    }

    jsiMessage.setProperty(rt, "thread", message.thread);
    jsiMessage.setProperty(rt, "user", message.user);
    jsiMessage.setProperty(rt, "type", std::to_string(message.type));

    if (message.future_type) {
      auto future_type = message.future_type.get();
      jsiMessage.setProperty(rt, "future_type", std::to_string(*future_type));
    }

    if (message.content) {
      auto content = message.content.get();
      jsiMessage.setProperty(rt, "content", *content);
    }

    jsiMessage.setProperty(rt, "time", std::to_string(message.time));

    size_t media_idx = 0;
    jsi::Array jsiMediaArray = jsi::Array(rt, media.size());
    for (const auto &media_info : media) {
      auto jsiMedia = jsi::Object(rt);
      jsiMedia.setProperty(rt, "id", media_info.id);
      jsiMedia.setProperty(rt, "uri", media_info.uri);
      jsiMedia.setProperty(rt, "type", media_info.type);
      jsiMedia.setProperty(rt, "extras", media_info.extras);

      jsiMediaArray.setValueAtIndex(rt, media_idx++, jsiMedia);
    }

    jsiMessage.setProperty(rt, "media_infos", jsiMediaArray);

    jsiMessages.setValueAtIndex(rt, writeIndex++, jsiMessage);
  }
  return jsiMessages;
}

jsi::Array parseDBThreads(
    jsi::Runtime &rt,
    std::shared_ptr<std::vector<Thread>> threadsVectorPtr) {
  size_t numThreads = threadsVectorPtr->size();
  jsi::Array jsiThreads = jsi::Array(rt, numThreads);
  size_t writeIdx = 0;
  for (const Thread &thread : *threadsVectorPtr) {
    jsi::Object jsiThread = jsi::Object(rt);
    jsiThread.setProperty(rt, "id", thread.id);
    jsiThread.setProperty(rt, "type", thread.type);
    jsiThread.setProperty(
        rt,
        "name",
        thread.name ? jsi::String::createFromUtf8(rt, *thread.name)
                    : jsi::Value::null());
    jsiThread.setProperty(
        rt,
        "description",
        thread.description
            ? jsi::String::createFromUtf8(rt, *thread.description)
            : jsi::Value::null());
    jsiThread.setProperty(rt, "color", thread.color);
    jsiThread.setProperty(
        rt, "creationTime", std::to_string(thread.creation_time));
    jsiThread.setProperty(
        rt,
        "parentThreadID",
        thread.parent_thread_id
            ? jsi::String::createFromUtf8(rt, *thread.parent_thread_id)
            : jsi::Value::null());
    jsiThread.setProperty(
        rt,
        "containingThreadID",
        thread.containing_thread_id
            ? jsi::String::createFromUtf8(rt, *thread.containing_thread_id)
            : jsi::Value::null());
    jsiThread.setProperty(
        rt,
        "community",
        thread.community ? jsi::String::createFromUtf8(rt, *thread.community)
                         : jsi::Value::null());
    jsiThread.setProperty(rt, "members", thread.members);
    jsiThread.setProperty(rt, "roles", thread.roles);
    jsiThread.setProperty(rt, "currentUser", thread.current_user);
    jsiThread.setProperty(
        rt,
        "sourceMessageID",
        thread.source_message_id
            ? jsi::String::createFromUtf8(rt, *thread.source_message_id)
            : jsi::Value::null());
    jsiThread.setProperty(rt, "repliesCount", thread.replies_count);
    jsiThread.setProperty(
        rt,
        "avatar",
        thread.avatar ? jsi::String::createFromUtf8(rt, *thread.avatar)
                      : jsi::Value::null());

    jsiThreads.setValueAtIndex(rt, writeIdx++, jsiThread);
  }
  return jsiThreads;
}

jsi::Value CommCoreModule::getClientDBStore(jsi::Runtime &rt) {
  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=, &innerRt]() {
          std::string error;
          std::vector<Draft> draftsVector;
          std::vector<Thread> threadsVector;
          std::vector<std::pair<Message, std::vector<Media>>> messagesVector;
          try {
            draftsVector = DatabaseManager::getQueryExecutor().getAllDrafts();
            messagesVector =
                DatabaseManager::getQueryExecutor().getAllMessages();
            threadsVector = DatabaseManager::getQueryExecutor().getAllThreads();
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
          this->jsInvoker_->invokeAsync([&innerRt,
                                         draftsVectorPtr,
                                         messagesVectorPtr,
                                         threadsVectorPtr,
                                         error,
                                         promise]() {
            if (error.size()) {
              promise->reject(error);
              return;
            }
            jsi::Array jsiDrafts = parseDBDrafts(innerRt, draftsVectorPtr);
            jsi::Array jsiMessages =
                parseDBMessages(innerRt, messagesVectorPtr);
            jsi::Array jsiThreads = parseDBThreads(innerRt, threadsVectorPtr);

            auto jsiClientDBStore = jsi::Object(innerRt);
            jsiClientDBStore.setProperty(innerRt, "messages", jsiMessages);
            jsiClientDBStore.setProperty(innerRt, "threads", jsiThreads);
            jsiClientDBStore.setProperty(innerRt, "drafts", jsiDrafts);

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
  auto messagesVector = this->runSyncOrThrowJSError<
      std::vector<std::pair<Message, std::vector<Media>>>>(rt, []() {
    return DatabaseManager::getQueryExecutor().getAllMessages();
  });
  auto messagesVectorPtr =
      std::make_shared<std::vector<std::pair<Message, std::vector<Media>>>>(
          std::move(messagesVector));
  jsi::Array jsiMessages = parseDBMessages(rt, messagesVectorPtr);
  return jsiMessages;
}

const std::string UPDATE_DRAFT_OPERATION = "update";
const std::string MOVE_DRAFT_OPERATION = "move";
const std::string REMOVE_ALL_DRAFTS_OPERATION = "remove_all";

std::vector<std::unique_ptr<DraftStoreOperationBase>>
createDraftStoreOperations(jsi::Runtime &rt, const jsi::Array &operations) {
  std::vector<std::unique_ptr<DraftStoreOperationBase>> draftStoreOps;
  for (auto idx = 0; idx < operations.size(rt); idx++) {
    auto op = operations.getValueAtIndex(rt, idx).asObject(rt);
    auto op_type = op.getProperty(rt, "type").asString(rt).utf8(rt);

    if (op_type == REMOVE_ALL_DRAFTS_OPERATION) {
      draftStoreOps.push_back(std::make_unique<RemoveAllDraftsOperation>());
      continue;
    }

    auto payload_obj = op.getProperty(rt, "payload").asObject(rt);
    if (op_type == UPDATE_DRAFT_OPERATION) {
      draftStoreOps.push_back(
          std::make_unique<UpdateDraftOperation>(rt, payload_obj));
    } else if (op_type == MOVE_DRAFT_OPERATION) {
      draftStoreOps.push_back(
          std::make_unique<MoveDraftOperation>(rt, payload_obj));
    } else {
      throw std::runtime_error("unsupported operation: " + op_type);
    }
  }
  return draftStoreOps;
}

jsi::Value CommCoreModule::processDraftStoreOperations(
    jsi::Runtime &rt,
    jsi::Array operations) {
  std::string createOperationsError;
  std::shared_ptr<std::vector<std::unique_ptr<DraftStoreOperationBase>>>
      draftStoreOpsPtr;
  try {
    auto draftStoreOps = createDraftStoreOperations(rt, operations);
    draftStoreOpsPtr =
        std::make_shared<std::vector<std::unique_ptr<DraftStoreOperationBase>>>(
            std::move(draftStoreOps));
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
              for (const auto &operation : *draftStoreOpsPtr) {
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

const std::string REKEY_OPERATION = "rekey";
const std::string REMOVE_OPERATION = "remove";
const std::string REPLACE_OPERATION = "replace";
const std::string REMOVE_MSGS_FOR_THREADS_OPERATION =
    "remove_messages_for_threads";
const std::string REMOVE_ALL_OPERATION = "remove_all";

std::vector<std::unique_ptr<MessageStoreOperationBase>>
createMessageStoreOperations(jsi::Runtime &rt, const jsi::Array &operations) {

  std::vector<std::unique_ptr<MessageStoreOperationBase>> messageStoreOps;

  for (auto idx = 0; idx < operations.size(rt); idx++) {
    auto op = operations.getValueAtIndex(rt, idx).asObject(rt);
    auto op_type = op.getProperty(rt, "type").asString(rt).utf8(rt);

    if (op_type == REMOVE_ALL_OPERATION) {
      messageStoreOps.push_back(std::make_unique<RemoveAllMessagesOperation>());
      continue;
    }

    auto payload_obj = op.getProperty(rt, "payload").asObject(rt);
    if (op_type == REMOVE_OPERATION) {
      messageStoreOps.push_back(
          std::make_unique<RemoveMessagesOperation>(rt, payload_obj));

    } else if (op_type == REMOVE_MSGS_FOR_THREADS_OPERATION) {
      messageStoreOps.push_back(
          std::make_unique<RemoveMessagesForThreadsOperation>(rt, payload_obj));

    } else if (op_type == REPLACE_OPERATION) {
      messageStoreOps.push_back(
          std::make_unique<ReplaceMessageOperation>(rt, payload_obj));

    } else if (op_type == REKEY_OPERATION) {
      messageStoreOps.push_back(
          std::make_unique<RekeyMessageOperation>(rt, payload_obj));

    } else {
      throw std::runtime_error("unsupported operation: " + op_type);
    }
  }

  return messageStoreOps;
}

jsi::Value CommCoreModule::processMessageStoreOperations(
    jsi::Runtime &rt,
    jsi::Array operations) {

  std::string createOperationsError;
  std::shared_ptr<std::vector<std::unique_ptr<MessageStoreOperationBase>>>
      messageStoreOpsPtr;
  try {
    auto messageStoreOps = createMessageStoreOperations(rt, operations);
    messageStoreOpsPtr = std::make_shared<
        std::vector<std::unique_ptr<MessageStoreOperationBase>>>(
        std::move(messageStoreOps));
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
              for (const auto &operation : *messageStoreOpsPtr) {
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

void CommCoreModule::processMessageStoreOperationsSync(
    jsi::Runtime &rt,
    jsi::Array operations) {
  std::vector<std::unique_ptr<MessageStoreOperationBase>> messageStoreOps;

  try {
    messageStoreOps = createMessageStoreOperations(rt, operations);
  } catch (const std::exception &e) {
    throw jsi::JSError(rt, e.what());
  }

  this->runSyncOrThrowJSError<void>(rt, [&messageStoreOps]() {
    try {
      DatabaseManager::getQueryExecutor().beginTransaction();
      for (const auto &operation : messageStoreOps) {
        operation->execute();
      }
      DatabaseManager::getQueryExecutor().commitTransaction();
    } catch (const std::exception &e) {
      DatabaseManager::getQueryExecutor().rollbackTransaction();
      throw e;
    }
  });
}

jsi::Array CommCoreModule::getAllThreadsSync(jsi::Runtime &rt) {
  auto threadsVector = this->runSyncOrThrowJSError<std::vector<Thread>>(
      rt, []() { return DatabaseManager::getQueryExecutor().getAllThreads(); });

  auto threadsVectorPtr =
      std::make_shared<std::vector<Thread>>(std::move(threadsVector));
  jsi::Array jsiThreads = parseDBThreads(rt, threadsVectorPtr);

  return jsiThreads;
}

std::vector<std::unique_ptr<ThreadStoreOperationBase>>
createThreadStoreOperations(jsi::Runtime &rt, const jsi::Array &operations) {
  std::vector<std::unique_ptr<ThreadStoreOperationBase>> threadStoreOps;

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
      throw std::runtime_error("unsupported operation: " + opType);
    }
  };
  return threadStoreOps;
}

jsi::Value CommCoreModule::processThreadStoreOperations(
    jsi::Runtime &rt,
    jsi::Array operations) {
  std::string operationsError;
  std::shared_ptr<std::vector<std::unique_ptr<ThreadStoreOperationBase>>>
      threadStoreOpsPtr;
  try {
    auto threadStoreOps = createThreadStoreOperations(rt, operations);
    threadStoreOpsPtr = std::make_shared<
        std::vector<std::unique_ptr<ThreadStoreOperationBase>>>(
        std::move(threadStoreOps));
  } catch (std::runtime_error &e) {
    operationsError = e.what();
  }
  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=]() {
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

void CommCoreModule::processThreadStoreOperationsSync(
    jsi::Runtime &rt,
    jsi::Array operations) {
  std::vector<std::unique_ptr<ThreadStoreOperationBase>> threadStoreOps;

  try {
    threadStoreOps = createThreadStoreOperations(rt, operations);
  } catch (const std::exception &e) {
    throw jsi::JSError(rt, e.what());
  }

  this->runSyncOrThrowJSError<void>(rt, [&threadStoreOps]() {
    try {
      DatabaseManager::getQueryExecutor().beginTransaction();
      for (const auto &operation : threadStoreOps) {
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
                  NotificationsCryptoModule::getNotificationsIdentityKeys();
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

} // namespace comm
