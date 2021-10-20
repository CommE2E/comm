#pragma once

#include "../DatabaseManagers/entities/Media.h"
#include "../DatabaseManagers/entities/Message.h"
#include "DatabaseManager.h"
#include <vector>

namespace comm {
class MessageStoreOperationBase {
public:
  virtual void execute() = 0;
  virtual ~MessageStoreOperationBase(){};
};

class RemoveMessagesOperation : public MessageStoreOperationBase {
public:
  RemoveMessagesOperation(jsi::Runtime &rt, const jsi::Object &payload)
      : msg_ids_to_remove{} {
    auto payload_ids = payload.getProperty(rt, "ids").asObject(rt).asArray(rt);
    for (size_t idx = 0; idx < payload_ids.size(rt); idx++) {
      this->msg_ids_to_remove.push_back(
          payload_ids.getValueAtIndex(rt, idx).asString(rt).utf8(rt));
    }
  }

  virtual void execute() override {
    DatabaseManager::getQueryExecutor().removeMessages(this->msg_ids_to_remove);
    DatabaseManager::getQueryExecutor().removeMediaForMessages(
        this->msg_ids_to_remove);
  }

private:
  std::vector<std::string> msg_ids_to_remove;
};

class RemoveMessagesForThreadsOperation : public MessageStoreOperationBase {
public:
  RemoveMessagesForThreadsOperation(std::vector<std::string> ids) : ids{ids} {
  }

  virtual void execute() override {
    DatabaseManager::getQueryExecutor().removeMessagesForThreads(this->ids);
    DatabaseManager::getQueryExecutor().removeMediaForThreads(this->ids);
  }

private:
  const std::vector<std::string> ids;
};

class ReplaceMessageOperation : public MessageStoreOperationBase {
public:
  ReplaceMessageOperation(Message msg, std::vector<Media> media_vector)
      : msg{std::move(msg)}, media_vector{std::move(media_vector)} {
  }

  virtual void execute() override {
    for (const Media &media : this->media_vector) {
      DatabaseManager::getQueryExecutor().replaceMedia(media);
    }
    DatabaseManager::getQueryExecutor().replaceMessage(this->msg);
  }

private:
  const Message msg;
  const std::vector<Media> media_vector;
};

class RekeyMessageOperation : public MessageStoreOperationBase {
public:
  RekeyMessageOperation(std::string from, std::string to) : from{from}, to{to} {
  }

  virtual void execute() override {
    DatabaseManager::getQueryExecutor().rekeyMessage(this->from, this->to);
  }

private:
  const std::string from;
  const std::string to;
};

class RemoveAllMessagesOperation : public MessageStoreOperationBase {
public:
  virtual void execute() override {
    DatabaseManager::getQueryExecutor().removeAllMessages();
    DatabaseManager::getQueryExecutor().removeAllMedia();
  }
};

} // namespace comm
