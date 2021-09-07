#pragma once

#include "../CryptoTools/Persist.h"
#include "DatabaseQueryExecutor.h"
#include "entities/Draft.h"

#include <string>

namespace comm {

class SQLiteQueryExecutor : public DatabaseQueryExecutor {
  void migrate();
  static auto getStorage();

public:
  static std::string sqliteFilePath;

  SQLiteQueryExecutor();
  std::string getDraft(std::string key) const override;
  void updateDraft(std::string key, std::string text) const override;
  bool moveDraft(std::string oldKey, std::string newKey) const override;
  std::vector<Draft> getAllDrafts() const override;
  void removeAllDrafts() const override;
  void removeAllMessages() const override;
  std::vector<Message> getAllMessages() const override;
  void removeMessages(std::vector<int> ids) const override;
  void removeMessagesForThreads(std::vector<int> threadIDs) const override;
  void replaceMessage(Message message) const override;
  void rekeyMessage(std::string from, std::string to) const override;
  std::vector<OlmPersistSession> getOlmPersistSessionsData() const override;
  folly::Optional<std::string> getOlmPersistAccountData() const override;
  void storeOlmPersistData(crypto::Persist persist) const override;
};

} // namespace comm
