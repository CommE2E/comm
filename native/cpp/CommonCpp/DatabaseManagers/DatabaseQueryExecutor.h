#pragma once

#include "../CryptoTools/Persist.h"
#include "entities/Draft.h"
#include "entities/Media.h"
#include "entities/Message.h"
#include "entities/MessageStoreThread.h"
#include "entities/OlmPersistAccount.h"
#include "entities/OlmPersistSession.h"
#include "entities/Thread.h"

#include <folly/Optional.h>

#include <jsi/jsi.h>
#include <string>

namespace comm {

namespace jsi = facebook::jsi;

/**
 * if any initialization/cleaning up steps are required for specific
 * database managers they should appear in constructors/destructors
 * following the RAII pattern
 */
class DatabaseQueryExecutor {
  virtual void setMetadata(std::string entry_name, std::string data) const = 0;
  virtual void clearMetadata(std::string entry_name) const = 0;
  virtual std::string getMetadata(std::string entry_name) const = 0;

public:
  virtual std::string getDraft(std::string key) const = 0;
  virtual std::unique_ptr<Thread> getThread(std::string threadID) const = 0;
  virtual void updateDraft(std::string key, std::string text) const = 0;
  virtual bool moveDraft(std::string oldKey, std::string newKey) const = 0;
  virtual std::vector<Draft> getAllDrafts() const = 0;
  virtual void removeAllDrafts() const = 0;
  virtual void removeAllMessages() const = 0;
  virtual std::vector<std::pair<Message, std::vector<Media>>>
  getAllMessages() const = 0;
  virtual void removeMessages(const std::vector<std::string> &ids) const = 0;
  virtual void
  removeMessagesForThreads(const std::vector<std::string> &threadIDs) const = 0;
  virtual void replaceMessage(const Message &message) const = 0;
  virtual void rekeyMessage(std::string from, std::string to) const = 0;
  virtual void removeAllMedia() const = 0;
  virtual void replaceMessageStoreThreads(
      const std::vector<MessageStoreThread> &threads) const = 0;
  virtual void
  removeMessageStoreThreads(const std::vector<std::string> &ids) const = 0;
  virtual void removeAllMessageStoreThreads() const = 0;
  virtual std::vector<MessageStoreThread> getAllMessageStoreThreads() const = 0;
  virtual void
  removeMediaForMessages(const std::vector<std::string> &msg_ids) const = 0;
  virtual void removeMediaForMessage(std::string msg_id) const = 0;
  virtual void
  removeMediaForThreads(const std::vector<std::string> &thread_ids) const = 0;
  virtual void replaceMedia(const Media &media) const = 0;
  virtual void rekeyMediaContainers(std::string from, std::string to) const = 0;
  virtual std::vector<Thread> getAllThreads() const = 0;
  virtual void removeThreads(std::vector<std::string> ids) const = 0;
  virtual void replaceThread(const Thread &thread) const = 0;
  virtual void removeAllThreads() const = 0;
  virtual void beginTransaction() const = 0;
  virtual void commitTransaction() const = 0;
  virtual void rollbackTransaction() const = 0;
  virtual std::vector<OlmPersistSession> getOlmPersistSessionsData() const = 0;
  virtual folly::Optional<std::string> getOlmPersistAccountData() const = 0;
  virtual void storeOlmPersistData(crypto::Persist persist) const = 0;
  virtual void setNotifyToken(std::string token) const = 0;
  virtual void clearNotifyToken() const = 0;
  virtual void setCurrentUserID(std::string userID) const = 0;
  virtual std::string getCurrentUserID() const = 0;
  virtual void setDeviceID(std::string deviceID) const = 0;
  virtual std::string getDeviceID() const = 0;
};

} // namespace comm
