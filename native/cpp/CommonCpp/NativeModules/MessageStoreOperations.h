#pragma once

#include "../DatabaseManagers/entities/Media.h"
#include "../DatabaseManagers/entities/Message.h"
#include "DatabaseManager.h"
#include <vector>

namespace comm {
class MessageStoreOperationBase {
public:
  virtual void execute() = 0;
};

class RemoveMessagesOperation : public MessageStoreOperationBase {
public:
  RemoveMessagesOperation(std::vector<std::string> ids) : ids_{ids} {
  }

  virtual void execute() override {
    DatabaseManager::getQueryExecutor().removeMessages(ids_);
  }

private:
  const std::vector<std::string> ids_;
};

class RemoveMessagesForThreadsOperation : public MessageStoreOperationBase {
public:
  RemoveMessagesForThreadsOperation(std::vector<std::string> ids) : ids_{ids} {
  }

  virtual void execute() override {
    DatabaseManager::getQueryExecutor().removeMessagesForThreads(ids_);
  }

private:
  const std::vector<std::string> ids_;
};

class ReplaceMessageOperation : public MessageStoreOperationBase {
public:
  ReplaceMessageOperation(Message msg, std::vector<Media> media_vector)
      : msg_{std::move(msg)}, media_vector_{std::move(media_vector)} {
  }

  virtual void execute() override {
    for (const Media &media : media_vector_) {
      DatabaseManager::getQueryExecutor().replaceMedia(media);
    }
    DatabaseManager::getQueryExecutor().replaceMessage(msg_);
  }

private:
  const Message msg_;
  const std::vector<Media> media_vector_;
};

class RekeyMessageOperation : public MessageStoreOperationBase {
public:
  RekeyMessageOperation(std::string from, std::string to)
      : from_{from}, to_{to} {
  }

  virtual void execute() override {
    DatabaseManager::getQueryExecutor().rekeyMessage(from_, to_);
  }

private:
  const std::string from_;
  const std::string to_;
};

class RemoveAllMessagesOperation : public MessageStoreOperationBase {
public:
  virtual void execute() override {
    DatabaseManager::getQueryExecutor().removeAllMessages();
  }
};

} // namespace comm
