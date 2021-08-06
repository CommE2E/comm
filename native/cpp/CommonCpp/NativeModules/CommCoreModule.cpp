#include "CommCoreModule.h"
#include "DatabaseManager.h"

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
        this->databaseThread.scheduleTask(job);
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
        this->databaseThread.scheduleTask(job);
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
        this->databaseThread.scheduleTask(job);
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
        this->databaseThread.scheduleTask(job);
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
        this->databaseThread.scheduleTask(job);
      });
}

jsi::Value CommCoreModule::removeAllMessages(jsi::Runtime &rt) {
  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=, &innerRt]() {
          std::string error;
          try {
            DatabaseManager::getQueryExecutor().removeAllMessages();
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
        this->databaseThread.scheduleTask(job);
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
          this->jsInvoker_->invokeAsync([=, &innerRt]() {
            if (error.size()) {
              promise->reject(error);
              return;
            }
            jsi::Array jsiMessages = jsi::Array(innerRt, numMessages);
            size_t writeIndex = 0;
            for (Message message : messagesVector) {
              auto jsiMessage = jsi::Object(innerRt);
              jsiMessage.setProperty(innerRt, "id", std::to_string(message.id));
              jsiMessage.setProperty(
                  innerRt, "thread", std::to_string(message.thread));
              jsiMessage.setProperty(
                  innerRt, "user", std::to_string(message.user));
              jsiMessage.setProperty(
                  innerRt, "type", std::to_string(message.type));
              jsiMessage.setProperty(
                  innerRt, "future_type", std::to_string(message.future_type));
              jsiMessage.setProperty(innerRt, "content", message.content);
              jsiMessage.setProperty(
                  innerRt, "time", std::to_string(message.time));
              jsiMessages.setValueAtIndex(innerRt, writeIndex++, jsiMessage);
            }
            promise->resolve(std::move(jsiMessages));
          });
        };
        this->databaseThread.scheduleTask(job);
      });
}

#define REMOVE_OPERATION "remove"
#define REPLACE_OPERATION "replace"

jsi::Value CommCoreModule::processMessageStoreOperations(
    jsi::Runtime &rt,
    const jsi::Array &operations) {

  std::vector<int> removed_msg_ids;
  std::vector<Message> replaced_msgs;

  for (auto idx = 0; idx < operations.size(rt); idx++) {
    auto op = operations.getValueAtIndex(rt, idx).asObject(rt);
    auto op_type = op.getProperty(rt, "type").asString(rt).utf8(rt);

    if (op_type == REMOVE_OPERATION) {
      auto payload_obj = op.getProperty(rt, "payload").asObject(rt);
      auto msg_idx =
          std::stoi(payload_obj.getProperty(rt, "id").asString(rt).utf8(rt));
      removed_msg_ids.push_back(msg_idx);

    } else if (op_type == REPLACE_OPERATION) {
      auto msg_obj = op.getProperty(rt, "payload").asObject(rt);

      auto id = std::stoi(msg_obj.getProperty(rt, "id").asString(rt).utf8(rt));
      auto thread =
          std::stoi(msg_obj.getProperty(rt, "thread").asString(rt).utf8(rt));
      auto user =
          std::stoi(msg_obj.getProperty(rt, "user").asString(rt).utf8(rt));
      auto type =
          std::stoi(msg_obj.getProperty(rt, "type").asString(rt).utf8(rt));
      auto future_type = std::stoi(
          msg_obj.getProperty(rt, "future_type").asString(rt).utf8(rt));
      auto content = msg_obj.getProperty(rt, "content").asString(rt).utf8(rt);
      auto time =
          std::stoi(msg_obj.getProperty(rt, "time").asString(rt).utf8(rt));
      Message message = {id, thread, user, type, future_type, content, time};
      replaced_msgs.push_back(message);
    }
  }

  return createPromiseAsJSIValue(
      rt, [=](jsi::Runtime &innerRt, std::shared_ptr<Promise> promise) {
        taskType job = [=, &innerRt]() {
          std::string error;
          try {
            DatabaseManager::getQueryExecutor().removeMessages(removed_msg_ids);
            for (const auto &msg : replaced_msgs) {
              DatabaseManager::getQueryExecutor().replaceMessage(msg);
            }
          } catch (std::system_error &e) {
            error = e.what();
          }
          this->jsInvoker_->invokeAsync([=, &innerRt]() {
            if (error.size()) {
              promise->reject(error);
            } else {
              promise->resolve(jsi::Value::undefined());
            }
          });
        };
        this->databaseThread.scheduleTask(job);
      });
}

CommCoreModule::CommCoreModule(
    std::shared_ptr<facebook::react::CallInvoker> jsInvoker)
    : facebook::react::CommCoreModuleSchemaCxxSpecJSI(jsInvoker),
      databaseThread("database"){};

} // namespace comm
