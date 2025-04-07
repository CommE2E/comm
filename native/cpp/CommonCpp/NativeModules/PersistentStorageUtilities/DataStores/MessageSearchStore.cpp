#include "MessageSearchStore.h"

#include "../../DBOperationBase.h"
#include <ReactCommon/TurboModuleUtils.h>
#include <jsi/jsi.h>

namespace comm {

OperationType MessageSearchStore::UPDATE_OPERATION = "update_search_messages";
OperationType MessageSearchStore::DELETE_OPERATION = "delete_search_message";

MessageSearchStore::MessageSearchStore(
    std::shared_ptr<facebook::react::CallInvoker> jsInvoker)
    : BaseDataStore(jsInvoker) {
}

jsi::Array MessageSearchStore::parseDBDataStore(
    jsi::Runtime &rt,
    std::shared_ptr<std::vector<MessageSearchResult>> vectorPtr) const {
  jsi::Array jsiSearchMessages = jsi::Array(rt, 0);

  return jsiSearchMessages;
}

std::vector<std::unique_ptr<DBOperationBase>>
MessageSearchStore::createOperations(
    jsi::Runtime &rt,
    const jsi::Array &operations) const {
  std::vector<std::unique_ptr<DBOperationBase>> messageSearchStoreOps;
  for (auto idx = 0; idx < operations.size(rt); idx++) {
    auto op = operations.getValueAtIndex(rt, idx).asObject(rt);
    auto op_type = op.getProperty(rt, "type").asString(rt).utf8(rt);

    auto payload_obj = op.getProperty(rt, "payload").asObject(rt);
    if (op_type == UPDATE_OPERATION) {
      messageSearchStoreOps.push_back(
          std::make_unique<UpdateMessageSearchIndexOperation>(rt, payload_obj));
    } else if (op_type == DELETE_OPERATION) {
      messageSearchStoreOps.push_back(
          std::make_unique<DeleteMessageFromSearchIndexOperation>(
              rt, payload_obj));
    } else {
      throw std::runtime_error("unsupported operation: " + op_type);
    }
  }
  return messageSearchStoreOps;
}

} // namespace comm
