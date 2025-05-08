#include "MessageStore.h"

#include "../../DBOperationBase.h"
#include <ReactCommon/TurboModuleUtils.h>
#include <jsi/jsi.h>

namespace comm {

OperationType MessageStore::REKEY_OPERATION = "rekey";
OperationType MessageStore::REMOVE_OPERATION = "remove";
OperationType MessageStore::REPLACE_OPERATION = "replace";
OperationType MessageStore::REMOVE_MSGS_FOR_THREADS_OPERATION =
    "remove_messages_for_threads";
OperationType MessageStore::REMOVE_ALL_OPERATION = "remove_all";

OperationType MessageStore::REPLACE_MESSAGE_THREADS_OPERATION =
    "replace_threads";
OperationType MessageStore::REMOVE_MESSAGE_THREADS_OPERATION = "remove_threads";
OperationType MessageStore::REMOVE_ALL_MESSAGE_THREADS_OPERATION =
    "remove_all_threads";

OperationType MessageStore::REPLACE_MESSAGE_STORE_LOCAL_MESSAGE_INFO_OPERATION =
    "replace_local_message_info";
OperationType MessageStore::REMOVE_MESSAGE_STORE_LOCAL_MESSAGE_INFOS_OPERATION =
    "remove_local_message_infos";
OperationType
    MessageStore::REMOVE_ALL_MESSAGE_STORE_LOCAL_MESSAGE_INFOS_OPERATION =
        "remove_all_local_message_infos";

MessageStore::MessageStore(
    std::shared_ptr<facebook::react::CallInvoker> jsInvoker)
    : BaseDataStore(jsInvoker) {
}

jsi::Array MessageStore::parseDBDataStore(
    jsi::Runtime &rt,
    std::shared_ptr<std::vector<MessageEntity>> messagesVectorPtr) const {
  size_t numMessages = messagesVectorPtr->size();
  jsi::Array jsiMessages = jsi::Array(rt, numMessages);
  size_t writeIndex = 0;
  for (const auto &[message, media] : *messagesVectorPtr) {
    auto jsiMessage = jsi::Object(rt);
    jsiMessage.setProperty(rt, "id", message.id);

    if (message.local_id.has_value()) {
      jsiMessage.setProperty(rt, "local_id", message.local_id.value());
    }

    jsiMessage.setProperty(rt, "thread", message.thread);
    jsiMessage.setProperty(rt, "user", message.user);
    jsiMessage.setProperty(rt, "type", std::to_string(message.type));

    if (message.future_type.has_value()) {
      int future_type = message.future_type.value();
      jsiMessage.setProperty(rt, "future_type", std::to_string(future_type));
    }

    if (message.content.has_value()) {
      jsiMessage.setProperty(rt, "content", message.content.value());
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

std::vector<std::unique_ptr<DBOperationBase>> MessageStore::createOperations(
    jsi::Runtime &rt,
    const jsi::Array &operations) const {

  std::vector<std::unique_ptr<DBOperationBase>> messageStoreOps;

  for (auto idx = 0; idx < operations.size(rt); idx++) {
    auto op = operations.getValueAtIndex(rt, idx).asObject(rt);
    auto op_type = op.getProperty(rt, "type").asString(rt).utf8(rt);

    if (op_type == REMOVE_ALL_OPERATION) {
      messageStoreOps.push_back(std::make_unique<RemoveAllMessagesOperation>());
      continue;
    }
    if (op_type == REMOVE_ALL_MESSAGE_THREADS_OPERATION) {
      messageStoreOps.push_back(
          std::make_unique<RemoveAllMessageStoreThreadsOperation>());
      continue;
    }
    if (op_type == REMOVE_ALL_MESSAGE_STORE_LOCAL_MESSAGE_INFOS_OPERATION) {
      messageStoreOps.push_back(
          std::make_unique<RemoveAllMessageStoreLocalMessageInfosOperation>());
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
    } else if (op_type == REPLACE_MESSAGE_THREADS_OPERATION) {
      messageStoreOps.push_back(
          std::make_unique<ReplaceMessageThreadsOperation>(rt, payload_obj));
    } else if (op_type == REMOVE_MESSAGE_THREADS_OPERATION) {
      messageStoreOps.push_back(
          std::make_unique<RemoveMessageStoreThreadsOperation>(
              rt, payload_obj));
    } else if (op_type == REPLACE_MESSAGE_STORE_LOCAL_MESSAGE_INFO_OPERATION) {
      messageStoreOps.push_back(
          std::make_unique<ReplaceMessageStoreLocalMessageInfoOperation>(
              rt, payload_obj));
    } else if (op_type == REMOVE_MESSAGE_STORE_LOCAL_MESSAGE_INFOS_OPERATION) {
      messageStoreOps.push_back(
          std::make_unique<RemoveMessageStoreLocalMessageInfosOperation>(
              rt, payload_obj));
    } else {
      throw std::runtime_error("unsupported operation: " + op_type);
    }
  }

  return messageStoreOps;
}

jsi::Array MessageStore::parseDBMessageStoreThreads(
    jsi::Runtime &rt,
    std::shared_ptr<std::vector<MessageStoreThread>> threadsVectorPtr) const {
  size_t numThreads = threadsVectorPtr->size();
  jsi::Array jsiThreads = jsi::Array(rt, numThreads);
  size_t writeIdx = 0;

  for (const MessageStoreThread &thread : *threadsVectorPtr) {
    jsi::Object jsiThread = jsi::Object(rt);
    jsiThread.setProperty(rt, "id", thread.id);
    jsiThread.setProperty(
        rt, "start_reached", std::to_string(thread.start_reached));

    jsiThreads.setValueAtIndex(rt, writeIdx++, jsiThread);
  }
  return jsiThreads;
}

jsi::Array MessageStore::parseDBMessageStoreLocalMessageInfos(
    jsi::Runtime &rt,
    std::shared_ptr<std::vector<LocalMessageInfo>> localMessageInfosVectorPtr)
    const {
  size_t numLocalMessageInfos = localMessageInfosVectorPtr->size();
  jsi::Array jsiLocalMessageInfos = jsi::Array(rt, numLocalMessageInfos);
  size_t writeIdx = 0;

  for (const LocalMessageInfo &localMessageInfo : *localMessageInfosVectorPtr) {
    jsi::Object jsiLocalMessageInfo = jsi::Object(rt);
    jsiLocalMessageInfo.setProperty(rt, "id", localMessageInfo.id);
    jsiLocalMessageInfo.setProperty(
        rt, "localMessageInfo", localMessageInfo.local_message_info);

    jsiLocalMessageInfos.setValueAtIndex(rt, writeIdx++, jsiLocalMessageInfo);
  }
  return jsiLocalMessageInfos;
}

} // namespace comm
