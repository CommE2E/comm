#pragma once

#include "../DatabaseManagers/entities/Media.h"
#include "../DatabaseManagers/entities/Message.h"
#include "DBOperationBase.h"
#include "DatabaseManager.h"
#include <optional>
#include <vector>

namespace comm {

class RemoveMessagesOperation : public DBOperationBase {
public:
  RemoveMessagesOperation(jsi::Runtime &rt, const jsi::Object &payload)
      : msg_ids_to_remove{} {
    auto payload_ids = payload.getProperty(rt, "ids").asObject(rt).asArray(rt);
    for (size_t idx = 0; idx < payload_ids.size(rt); idx++) {
      this->msg_ids_to_remove.push_back(
          payload_ids.getValueAtIndex(rt, idx).asString(rt).utf8(rt));
    }
  }

  virtual void execute(DatabaseIdentifier id) override {
    DatabaseManager::getQueryExecutor(id).removeMessages(
        this->msg_ids_to_remove);
    DatabaseManager::getQueryExecutor(id).removeMediaForMessages(
        this->msg_ids_to_remove);
  }

private:
  std::vector<std::string> msg_ids_to_remove;
};

class RemoveMessagesForThreadsOperation : public DBOperationBase {
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

  virtual void execute(DatabaseIdentifier id) override {
    DatabaseManager::getQueryExecutor(id).removeMessagesForThreads(
        this->thread_ids);
    DatabaseManager::getQueryExecutor(id).removeMediaForThreads(
        this->thread_ids);
  }

private:
  std::vector<std::string> thread_ids;
};

class ReplaceMessageOperation : public DBOperationBase {
public:
  ReplaceMessageOperation(
      jsi::Runtime &rt,
      const jsi::Object &payload,
      bool backupItem)
      : media_vector{}, backupItem(backupItem) {

    auto msg_id = payload.getProperty(rt, "id").asString(rt).utf8(rt);

    auto maybe_local_id = payload.getProperty(rt, "local_id");
    std::optional<std::string> local_id = maybe_local_id.isString()
        ? std::optional<std::string>(maybe_local_id.asString(rt).utf8(rt))
        : std::nullopt;

    auto thread = payload.getProperty(rt, "thread").asString(rt).utf8(rt);
    auto user = payload.getProperty(rt, "user").asString(rt).utf8(rt);
    auto type =
        std::stoi(payload.getProperty(rt, "type").asString(rt).utf8(rt));

    auto maybe_future_type = payload.getProperty(rt, "future_type");
    std::optional<int> future_type = maybe_future_type.isString()
        ? std::optional<int>(std::stoi(maybe_future_type.asString(rt).utf8(rt)))
        : std::nullopt;

    auto maybe_content = payload.getProperty(rt, "content");
    std::optional<std::string> content = maybe_content.isString()
        ? std::optional<std::string>(maybe_content.asString(rt).utf8(rt))
        : std::nullopt;

    auto time =
        std::stoll(payload.getProperty(rt, "time").asString(rt).utf8(rt));

    this->msg = std::make_unique<Message>(Message{
        msg_id, local_id, thread, user, type, future_type, content, time});

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

  virtual void execute(DatabaseIdentifier id) override {
    DatabaseManager::getQueryExecutor().removeMediaForMessage(msg->id);
    for (auto &&media : this->media_vector) {
      DatabaseManager::getQueryExecutor().replaceMedia(
          std::move(*media), this->backupItem);
    }
    DatabaseManager::getQueryExecutor().replaceMessage(
        std::move(*this->msg), this->backupItem);
  }

private:
  std::unique_ptr<Message> msg;
  std::vector<std::unique_ptr<Media>> media_vector;
  bool backupItem;
};

class RekeyMessageOperation : public DBOperationBase {
public:
  RekeyMessageOperation(jsi::Runtime &rt, const jsi::Object &payload) {
    this->from = payload.getProperty(rt, "from").asString(rt).utf8(rt);
    this->to = payload.getProperty(rt, "to").asString(rt).utf8(rt);
  }

  virtual void execute(DatabaseIdentifier id) override {
    DatabaseManager::getQueryExecutor(id).rekeyMessage(this->from, this->to);
    DatabaseManager::getQueryExecutor(id).rekeyMediaContainers(
        this->from, this->to);
  }

private:
  std::string from;
  std::string to;
};

class RemoveAllMessagesOperation : public DBOperationBase {
public:
  virtual void execute(DatabaseIdentifier id) override {
    DatabaseManager::getQueryExecutor(id).removeAllMessages();
    DatabaseManager::getQueryExecutor(id).removeAllMedia();
  }
};

class ReplaceMessageThreadsOperation : public DBOperationBase {
public:
  ReplaceMessageThreadsOperation(
      jsi::Runtime &rt,
      const jsi::Object &payload,
      bool backupItem)
      : msg_threads{}, backupItem(backupItem) {
    auto threads = payload.getProperty(rt, "threads").asObject(rt).asArray(rt);
    for (size_t idx = 0; idx < threads.size(rt); idx++) {
      auto thread = threads.getValueAtIndex(rt, idx).asObject(rt);

      auto thread_id = thread.getProperty(rt, "id").asString(rt).utf8(rt);
      auto start_reached = std::stoi(
          thread.getProperty(rt, "start_reached").asString(rt).utf8(rt));
      MessageStoreThread msg_thread =
          MessageStoreThread{thread_id, start_reached};
      this->msg_threads.push_back(msg_thread);
    }
  }

  virtual void execute(DatabaseIdentifier id) override {
    DatabaseManager::getQueryExecutor(id).replaceMessageStoreThreads(
        this->msg_threads, this->backupItem);
  }

private:
  std::vector<MessageStoreThread> msg_threads;
  bool backupItem;
};

class RemoveAllMessageStoreThreadsOperation : public DBOperationBase {
public:
  virtual void execute(DatabaseIdentifier id) override {
    DatabaseManager::getQueryExecutor(id).removeAllMessageStoreThreads();
  }
};

class RemoveMessageStoreThreadsOperation : public DBOperationBase {
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

  virtual void execute(DatabaseIdentifier id) override {
    DatabaseManager::getQueryExecutor(id).removeMessageStoreThreads(
        this->thread_ids);
  }

private:
  std::vector<std::string> thread_ids;
};

class RemoveMessageStoreLocalMessageInfosOperation : public DBOperationBase {
public:
  RemoveMessageStoreLocalMessageInfosOperation(
      jsi::Runtime &rt,
      const jsi::Object &payload)
      : ids{} {
    auto payload_ids = payload.getProperty(rt, "ids").asObject(rt).asArray(rt);
    for (size_t idx = 0; idx < payload_ids.size(rt); idx++) {
      this->ids.push_back(
          payload_ids.getValueAtIndex(rt, idx).asString(rt).utf8(rt));
    }
  }

  virtual void execute(DatabaseIdentifier id) override {
    DatabaseManager::getQueryExecutor(id).removeMessageStoreLocalMessageInfos(
        this->ids);
  }

private:
  std::vector<std::string> ids;
};

class ReplaceMessageStoreLocalMessageInfoOperation : public DBOperationBase {
public:
  ReplaceMessageStoreLocalMessageInfoOperation(
      jsi::Runtime &rt,
      const jsi::Object &payload,
      bool backupItem)
      : localMessageInfo{}, backupItem(backupItem) {
    std::string id = payload.getProperty(rt, "id").asString(rt).utf8(rt);
    std::string local_message_info =
        payload.getProperty(rt, "localMessageInfo").asString(rt).utf8(rt);

    this->localMessageInfo = LocalMessageInfo{id, local_message_info};
  }

  virtual void execute(DatabaseIdentifier id) override {
    DatabaseManager::getQueryExecutor(id).replaceMessageStoreLocalMessageInfo(
        this->localMessageInfo, this->backupItem);
  }

private:
  LocalMessageInfo localMessageInfo;
  bool backupItem;
};

class RemoveAllMessageStoreLocalMessageInfosOperation : public DBOperationBase {
public:
  virtual void execute(DatabaseIdentifier id) override {
    DatabaseManager::getQueryExecutor(id)
        .removeAllMessageStoreLocalMessageInfos();
  }
};

} // namespace comm
