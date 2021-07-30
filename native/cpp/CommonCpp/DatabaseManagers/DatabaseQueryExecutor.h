#pragma once

#include "entities/Draft.h"
#include "entities/Message.h"
#include "entities/OlmPersistAccount.h"
#include "entities/OlmPersistSession.h"

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
  virtual void removeMessages(std::vector<int> ids) const = 0;
  virtual void replaceMessage(Message message) const = 0;
};

} // namespace comm
