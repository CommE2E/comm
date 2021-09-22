#pragma once

#include "../CryptoTools/Persist.h"
#include "entities/Draft.h"
#include "entities/Media.h"
#include "entities/Message.h"
#include "entities/OlmPersistAccount.h"
#include "entities/OlmPersistSession.h"

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
public:
  virtual std::string getDraft(std::string key) const = 0;
  virtual void updateDraft(std::string key, std::string text) const = 0;
  virtual bool moveDraft(std::string oldKey, std::string newKey) const = 0;
  virtual std::vector<Draft> getAllDrafts() const = 0;
  virtual void removeAllDrafts() const = 0;
  virtual void removeAllMessages() const = 0;
  virtual std::vector<Message> getAllMessages() const = 0;
  virtual void removeMessages(std::vector<std::string> ids) const = 0;
  virtual void
  removeMessagesForThreads(std::vector<std::string> threadIDs) const = 0;
  virtual void replaceMessage(Message &message) const = 0;
  virtual void rekeyMessage(std::string from, std::string to) const = 0;
  virtual void replaceMedia(Media &media) const = 0;
  virtual std::vector<OlmPersistSession> getOlmPersistSessionsData() const = 0;
  virtual folly::Optional<std::string> getOlmPersistAccountData() const = 0;
  virtual void storeOlmPersistData(crypto::Persist persist) const = 0;
};

} // namespace comm
