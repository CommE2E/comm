#pragma once

#include "../../../DatabaseManagers/entities/Media.h"
#include "../../../DatabaseManagers/entities/Message.h"
#include "../../DBOperationBase.h"
#include "BaseDataStore.h"
#include "MessageStoreOperations.h"

#include <jsi/jsi.h>

namespace comm {

using MessageEntity = std::pair<Message, std::vector<Media>>;

class MessageStore : public BaseDataStore<DBOperationBase, MessageEntity> {
private:
  static OperationType REKEY_OPERATION;
  static OperationType REMOVE_OPERATION;
  static OperationType REPLACE_OPERATION;
  static OperationType REMOVE_MSGS_FOR_THREADS_OPERATION;
  static OperationType REMOVE_ALL_OPERATION;

  static OperationType REPLACE_MESSAGE_THREADS_OPERATION;
  static OperationType REMOVE_MESSAGE_THREADS_OPERATION;
  static OperationType REMOVE_ALL_MESSAGE_THREADS_OPERATION;

public:
  MessageStore(std::shared_ptr<facebook::react::CallInvoker> jsInvoker);

  std::vector<std::unique_ptr<DBOperationBase>> createOperations(
      jsi::Runtime &rt,
      const jsi::Array &operations) const override;

  jsi::Array parseDBDataStore(
      jsi::Runtime &rt,
      std::shared_ptr<std::vector<MessageEntity>> dataVectorPtr) const override;

  jsi::Array parseDBMessageStoreThreads(
      jsi::Runtime &rt,
      std::shared_ptr<std::vector<MessageStoreThread>> threadsVectorPtr) const;
};

} // namespace comm
