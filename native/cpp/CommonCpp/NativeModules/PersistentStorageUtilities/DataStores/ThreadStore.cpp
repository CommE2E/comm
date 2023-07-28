#include "ThreadStore.h"

#include <ReactCommon/TurboModuleUtils.h>
#include <jsi/jsi.h>

namespace comm {

using namespace facebook::react;

OperationType ThreadStore::REMOVE_OPERATION = "remove";
OperationType ThreadStore::REMOVE_ALL_OPERATION = "remove_all";
OperationType ThreadStore::REPLACE_OPERATION = "replace";

ThreadStore::ThreadStore(
    std::shared_ptr<facebook::react::CallInvoker> jsInvoker)
    : BaseDataStore(jsInvoker) {
}

jsi::Array ThreadStore::parseDBDataStore(
    jsi::Runtime &rt,
    std::shared_ptr<std::vector<Thread>> threadsVectorPtr) const {
  size_t numThreads = threadsVectorPtr->size();
  jsi::Array jsiThreads = jsi::Array(rt, numThreads);
  size_t writeIdx = 0;
  for (const Thread &thread : *threadsVectorPtr) {
    jsi::Object jsiThread = jsi::Object(rt);
    jsiThread.setProperty(rt, "id", thread.id);
    jsiThread.setProperty(rt, "type", thread.type);
    jsiThread.setProperty(
        rt,
        "name",
        thread.name ? jsi::String::createFromUtf8(rt, *thread.name)
                    : jsi::Value::null());
    jsiThread.setProperty(
        rt,
        "description",
        thread.description
            ? jsi::String::createFromUtf8(rt, *thread.description)
            : jsi::Value::null());
    jsiThread.setProperty(rt, "color", thread.color);
    jsiThread.setProperty(
        rt, "creationTime", std::to_string(thread.creation_time));
    jsiThread.setProperty(
        rt,
        "parentThreadID",
        thread.parent_thread_id
            ? jsi::String::createFromUtf8(rt, *thread.parent_thread_id)
            : jsi::Value::null());
    jsiThread.setProperty(
        rt,
        "containingThreadID",
        thread.containing_thread_id
            ? jsi::String::createFromUtf8(rt, *thread.containing_thread_id)
            : jsi::Value::null());
    jsiThread.setProperty(
        rt,
        "community",
        thread.community ? jsi::String::createFromUtf8(rt, *thread.community)
                         : jsi::Value::null());
    jsiThread.setProperty(rt, "members", thread.members);
    jsiThread.setProperty(rt, "roles", thread.roles);
    jsiThread.setProperty(rt, "currentUser", thread.current_user);
    jsiThread.setProperty(
        rt,
        "sourceMessageID",
        thread.source_message_id
            ? jsi::String::createFromUtf8(rt, *thread.source_message_id)
            : jsi::Value::null());
    jsiThread.setProperty(rt, "repliesCount", thread.replies_count);
    jsiThread.setProperty(rt, "pinnedCount", thread.pinned_count);

    if (thread.avatar) {
      auto avatar = jsi::String::createFromUtf8(rt, *thread.avatar);
      jsiThread.setProperty(rt, "avatar", avatar);
    }

    jsiThreads.setValueAtIndex(rt, writeIdx++, jsiThread);
  }
  return jsiThreads;
}

std::vector<std::unique_ptr<ThreadStoreOperationBase>>
ThreadStore::createOperations(jsi::Runtime &rt, const jsi::Array &operations)
    const {
  std::vector<std::unique_ptr<ThreadStoreOperationBase>> threadStoreOps;

  for (size_t idx = 0; idx < operations.size(rt); idx++) {
    jsi::Object op = operations.getValueAtIndex(rt, idx).asObject(rt);
    std::string opType = op.getProperty(rt, "type").asString(rt).utf8(rt);

    if (opType == REMOVE_OPERATION) {
      std::vector<std::string> threadIDsToRemove;
      jsi::Object payloadObj = op.getProperty(rt, "payload").asObject(rt);
      jsi::Array threadIDs =
          payloadObj.getProperty(rt, "ids").asObject(rt).asArray(rt);
      for (int threadIdx = 0; threadIdx < threadIDs.size(rt); threadIdx++) {
        threadIDsToRemove.push_back(
            threadIDs.getValueAtIndex(rt, threadIdx).asString(rt).utf8(rt));
      }
      threadStoreOps.push_back(std::make_unique<RemoveThreadsOperation>(
          std::move(threadIDsToRemove)));
    } else if (opType == REMOVE_ALL_OPERATION) {
      threadStoreOps.push_back(std::make_unique<RemoveAllThreadsOperation>());
    } else if (opType == REPLACE_OPERATION) {
      jsi::Object threadObj = op.getProperty(rt, "payload").asObject(rt);
      std::string threadID =
          threadObj.getProperty(rt, "id").asString(rt).utf8(rt);
      int type = std::lround(threadObj.getProperty(rt, "type").asNumber());
      jsi::Value maybeName = threadObj.getProperty(rt, "name");
      std::unique_ptr<std::string> name = maybeName.isString()
          ? std::make_unique<std::string>(maybeName.asString(rt).utf8(rt))
          : nullptr;

      jsi::Value maybeDescription = threadObj.getProperty(rt, "description");
      std::unique_ptr<std::string> description = maybeDescription.isString()
          ? std::make_unique<std::string>(
                maybeDescription.asString(rt).utf8(rt))
          : nullptr;

      std::string color =
          threadObj.getProperty(rt, "color").asString(rt).utf8(rt);
      int64_t creationTime = std::stoll(
          threadObj.getProperty(rt, "creationTime").asString(rt).utf8(rt));

      jsi::Value maybeParentThreadID =
          threadObj.getProperty(rt, "parentThreadID");
      std::unique_ptr<std::string> parentThreadID =
          maybeParentThreadID.isString()
          ? std::make_unique<std::string>(
                maybeParentThreadID.asString(rt).utf8(rt))
          : nullptr;

      jsi::Value maybeContainingThreadID =
          threadObj.getProperty(rt, "containingThreadID");
      std::unique_ptr<std::string> containingThreadID =
          maybeContainingThreadID.isString()
          ? std::make_unique<std::string>(
                maybeContainingThreadID.asString(rt).utf8(rt))
          : nullptr;

      jsi::Value maybeCommunity = threadObj.getProperty(rt, "community");
      std::unique_ptr<std::string> community = maybeCommunity.isString()
          ? std::make_unique<std::string>(maybeCommunity.asString(rt).utf8(rt))
          : nullptr;

      std::string members =
          threadObj.getProperty(rt, "members").asString(rt).utf8(rt);
      std::string roles =
          threadObj.getProperty(rt, "roles").asString(rt).utf8(rt);
      std::string currentUser =
          threadObj.getProperty(rt, "currentUser").asString(rt).utf8(rt);

      jsi::Value maybeSourceMessageID =
          threadObj.getProperty(rt, "sourceMessageID");
      std::unique_ptr<std::string> sourceMessageID =
          maybeSourceMessageID.isString()
          ? std::make_unique<std::string>(
                maybeSourceMessageID.asString(rt).utf8(rt))
          : nullptr;

      int repliesCount =
          std::lround(threadObj.getProperty(rt, "repliesCount").asNumber());

      jsi::Value maybeAvatar = threadObj.getProperty(rt, "avatar");
      std::unique_ptr<std::string> avatar = maybeAvatar.isString()
          ? std::make_unique<std::string>(maybeAvatar.asString(rt).utf8(rt))
          : nullptr;

      jsi::Value maybePinnedCount = threadObj.getProperty(rt, "pinnedCount");
      int pinnedCount = maybePinnedCount.isNumber()
          ? std::lround(maybePinnedCount.asNumber())
          : 0;
      Thread thread{
          threadID,
          type,
          std::move(name),
          std::move(description),
          color,
          creationTime,
          std::move(parentThreadID),
          std::move(containingThreadID),
          std::move(community),
          members,
          roles,
          currentUser,
          std::move(sourceMessageID),
          repliesCount,
          std::move(avatar),
          pinnedCount};

      threadStoreOps.push_back(
          std::make_unique<ReplaceThreadOperation>(std::move(thread)));
    } else {
      throw std::runtime_error("unsupported operation: " + opType);
    }
  };
  return threadStoreOps;
}

} // namespace comm
