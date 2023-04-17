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
  RemoveMessagesForThreadsOperation(
      jsi::Runtime &rt,
      const jsi::Object &payload)
      : thread_ids{} {
    auto payload_ids =
        payload.getProperty(rt, "threadIDs").asObject(rt).asArray(rt);
    for (size_t idx = 0; idx < payload_ids.size(rt); idx++) {
      this->thread_ids.push_back(
          payload_ids.getValueAtIndex(rt, idx).asString(rt).utf8(rt));
    }
  }

  virtual void execute() override {
    DatabaseManager::getQueryExecutor().removeMessagesForThreads(
        this->thread_ids);
    DatabaseManager::getQueryExecutor().removeMediaForThreads(this->thread_ids);
  }

private:
  std::vector<std::string> thread_ids;
};

class ReplaceMessageOperation : public MessageStoreOperationBase {
public:
  ReplaceMessageOperation(jsi::Runtime &rt, const jsi::Object &payload)
      : media_vector{} {

    auto msg_id = payload.getProperty(rt, "id").asString(rt).utf8(rt);

    auto maybe_local_id = payload.getProperty(rt, "local_id");
    auto local_id = maybe_local_id.isString()
        ? std::make_unique<std::string>(maybe_local_id.asString(rt).utf8(rt))
        : nullptr;

    auto thread = payload.getProperty(rt, "thread").asString(rt).utf8(rt);
    auto user = payload.getProperty(rt, "user").asString(rt).utf8(rt);
    auto type =
        std::stoi(payload.getProperty(rt, "type").asString(rt).utf8(rt));

    auto maybe_future_type = payload.getProperty(rt, "future_type");
    auto future_type = maybe_future_type.isString()
        ? std::make_unique<int>(
              std::stoi(maybe_future_type.asString(rt).utf8(rt)))
        : nullptr;

    auto maybe_content = payload.getProperty(rt, "content");
    auto content = maybe_content.isString()
        ? std::make_unique<std::string>(maybe_content.asString(rt).utf8(rt))
        : nullptr;

    auto time =
        std::stoll(payload.getProperty(rt, "time").asString(rt).utf8(rt));

    this->msg = std::make_unique<Message>(Message{
        msg_id,
        std::move(local_id),
        thread,
        user,
        type,
        std::move(future_type),
        std::move(content),
        time});

    if (payload.getProperty(rt, "media_infos").isObject()) {
      auto media_infos =
          payload.getProperty(rt, "media_infos").asObject(rt).asArray(rt);

      for (size_t media_info_idx = 0; media_info_idx < media_infos.size(rt);
           media_info_idx++) {
        auto media_info =
            media_infos.getValueAtIndex(rt, media_info_idx).asObject(rt);
        auto media_id = media_info.getProperty(rt, "id").asString(rt).utf8(rt);
        auto media_uri =
            media_info.getProperty(rt, "uri").asString(rt).utf8(rt);
        auto media_type =
            media_info.getProperty(rt, "type").asString(rt).utf8(rt);
        auto media_extras =
            media_info.getProperty(rt, "extras").asString(rt).utf8(rt);

        this->media_vector.push_back(std::make_unique<Media>(Media{
            media_id, msg_id, thread, media_uri, media_type, media_extras}));
      }
    }
  }

  virtual void execute() override {
    DatabaseManager::getQueryExecutor().removeMediaForMessage(msg->id);
    for (auto &&media : this->media_vector) {
      DatabaseManager::getQueryExecutor().replaceMedia(std::move(*media));
    }
    DatabaseManager::getQueryExecutor().replaceMessage(std::move(*this->msg));
  }

private:
  std::unique_ptr<Message> msg;
  std::vector<std::unique_ptr<Media>> media_vector;
};

class RekeyMessageOperation : public MessageStoreOperationBase {
public:
  RekeyMessageOperation(jsi::Runtime &rt, const jsi::Object &payload) {
    this->from = payload.getProperty(rt, "from").asString(rt).utf8(rt);
    this->to = payload.getProperty(rt, "to").asString(rt).utf8(rt);
  }

  virtual void execute() override {
    DatabaseManager::getQueryExecutor().rekeyMessage(this->from, this->to);
    DatabaseManager::getQueryExecutor().rekeyMediaContainers(
        this->from, this->to);
  }

private:
  std::string from;
  std::string to;
};

class RemoveAllMessagesOperation : public MessageStoreOperationBase {
public:
  virtual void execute() override {
    DatabaseManager::getQueryExecutor().removeAllMessages();
    DatabaseManager::getQueryExecutor().removeAllMedia();
  }
};

class ReplaceMessageThreadsOperation : public MessageStoreOperationBase {
public:
  ReplaceMessageThreadsOperation(jsi::Runtime &rt, const jsi::Object &payload)
      : msg_threads{} {
    auto threads = payload.getProperty(rt, "threads").asObject(rt).asArray(rt);
    for (size_t idx = 0; idx < threads.size(rt); idx++) {
      auto thread = threads.getValueAtIndex(rt, idx).asObject(rt);

      auto thread_id = thread.getProperty(rt, "id").asString(rt).utf8(rt);
      auto start_reached = std::stoi(
          thread.getProperty(rt, "start_reached").asString(rt).utf8(rt));
      auto last_navigated_to = std::stoll(
          thread.getProperty(rt, "last_navigated_to").asString(rt).utf8(rt));
      auto last_pruned = std::stoll(
          thread.getProperty(rt, "last_pruned").asString(rt).utf8(rt));

      MessageStoreThread msg_thread = MessageStoreThread{
          thread_id, start_reached, last_navigated_to, last_pruned};
      this->msg_threads.push_back(msg_thread);
    }
  }

  virtual void execute() override {
    DatabaseManager::getQueryExecutor().replaceMessageStoreThreads(
        this->msg_threads);
  }

private:
  std::vector<MessageStoreThread> msg_threads;
};

class RemoveAllMessageStoreThreadsOperation : public MessageStoreOperationBase {
public:
  virtual void execute() override {
    DatabaseManager::getQueryExecutor().removeAllMessageStoreThreads();
  }
};

class RemoveMessageStoreThreadsOperation : public MessageStoreOperationBase {
public:
  RemoveMessageStoreThreadsOperation(
      jsi::Runtime &rt,
      const jsi::Object &payload)
      : thread_ids{} {
    auto payload_ids = payload.getProperty(rt, "ids").asObject(rt).asArray(rt);
    for (size_t idx = 0; idx < payload_ids.size(rt); idx++) {
      this->thread_ids.push_back(
          payload_ids.getValueAtIndex(rt, idx).asString(rt).utf8(rt));
    }
  }

  virtual void execute() override {
    DatabaseManager::getQueryExecutor().removeMessageStoreThreads(
        this->thread_ids);
  }

private:
  std::vector<std::string> thread_ids;
};

} // namespace comm
