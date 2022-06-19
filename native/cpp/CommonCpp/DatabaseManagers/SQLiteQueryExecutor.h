#pragma once

#include <CryptoTools/Persist.h>
#include <DatabaseManagers/DatabaseQueryExecutor.h>
#include <DatabaseManagers/entities/Draft.h>

#include <mutex>
#include <string>

namespace comm {

class SQLiteQueryExecutor : public DatabaseQueryExecutor {
  void migrate();
  static auto &getStorage();

  static std::once_flag initialized;
  static int sqlcipherEncryptionKeySize;
  static std::string secureStoreEncryptionKeyID;

public:
  static std::string sqliteFilePath;
  static std::string encryptionKey;

  SQLiteQueryExecutor();
  static void initialize(std::string &databasePath);
  std::unique_ptr<Thread> getThread(std::string threadID) const override;
  std::string getDraft(std::string key) const override;
  void updateDraft(std::string key, std::string text) const override;
  bool moveDraft(std::string oldKey, std::string newKey) const override;
  std::vector<Draft> getAllDrafts() const override;
  void removeAllDrafts() const override;
  void removeAllMessages() const override;
  std::vector<std::pair<Message, std::vector<Media>>>
  getAllMessages() const override;
  void removeMessages(const std::vector<std::string> &ids) const override;
  void removeMessagesForThreads(
      const std::vector<std::string> &threadIDs) const override;
  void replaceMessage(const Message &message) const override;
  void rekeyMessage(std::string from, std::string to) const override;
  void removeAllMedia() const override;
  void removeMediaForMessages(
      const std::vector<std::string> &msg_ids) const override;
  void removeMediaForMessage(std::string msg_id) const override;
  void removeMediaForThreads(
      const std::vector<std::string> &thread_ids) const override;
  void replaceMedia(const Media &media) const override;
  void rekeyMediaContainers(std::string from, std::string to) const override;
  std::vector<Thread> getAllThreads() const override;
  void removeThreads(std::vector<std::string> ids) const override;
  void replaceThread(const Thread &thread) const override;
  void removeAllThreads() const override;
  void beginTransaction() const override;
  void commitTransaction() const override;
  void rollbackTransaction() const override;
  std::vector<OlmPersistSession> getOlmPersistSessionsData() const override;
  folly::Optional<std::string> getOlmPersistAccountData() const override;
  void storeOlmPersistData(crypto::Persist persist) const override;
  void setNotifyToken(std::string token) const override;
  void clearNotifyToken() const override;
};

} // namespace comm
