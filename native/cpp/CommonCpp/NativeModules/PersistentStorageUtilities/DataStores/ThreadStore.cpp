#include "ThreadStore.h"

#include "../../DBOperationBase.h"
#include <ReactCommon/TurboModuleUtils.h>
#include <jsi/jsi.h>

namespace comm {

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
        thread.name.has_value()
            ? jsi::String::createFromUtf8(rt, thread.name.value())
            : jsi::Value::null());
    jsiThread.setProperty(
        rt,
        "description",
        thread.description.has_value()
            ? jsi::String::createFromUtf8(rt, thread.description.value())
            : jsi::Value::null());
    jsiThread.setProperty(rt, "color", thread.color);
    jsiThread.setProperty(
        rt, "creationTime", std::to_string(thread.creation_time));
    jsiThread.setProperty(
        rt,
        "parentThreadID",
        thread.parent_thread_id.has_value()
            ? jsi::String::createFromUtf8(rt, thread.parent_thread_id.value())
            : jsi::Value::null());
    jsiThread.setProperty(
        rt,
        "containingThreadID",
        thread.containing_thread_id.has_value()
            ? jsi::String::createFromUtf8(
                  rt, thread.containing_thread_id.value())
            : jsi::Value::null());
    jsiThread.setProperty(
        rt,
        "community",
        thread.community.has_value()
            ? jsi::String::createFromUtf8(rt, thread.community.value())
            : jsi::Value::null());
    jsiThread.setProperty(rt, "members", thread.members);
    jsiThread.setProperty(rt, "roles", thread.roles);
    jsiThread.setProperty(rt, "currentUser", thread.current_user);
    jsiThread.setProperty(
        rt,
        "sourceMessageID",
        thread.source_message_id.has_value()
            ? jsi::String::createFromUtf8(rt, thread.source_message_id.value())
            : jsi::Value::null());
    jsiThread.setProperty(rt, "repliesCount", thread.replies_count);
    jsiThread.setProperty(rt, "pinnedCount", thread.pinned_count);

    if (thread.avatar.has_value()) {
      auto avatar = jsi::String::createFromUtf8(rt, thread.avatar.value());
      jsiThread.setProperty(rt, "avatar", avatar);
    }

    if (thread.timestamps.has_value()) {
      auto timestamps =
          jsi::String::createFromUtf8(rt, thread.timestamps.value());
      jsiThread.setProperty(rt, "timestamps", timestamps);
    }

    jsiThreads.setValueAtIndex(rt, writeIdx++, jsiThread);
  }
  return jsiThreads;
}

std::vector<std::unique_ptr<DBOperationBase>> ThreadStore::createOperations(
    jsi::Runtime &rt,
    const jsi::Array &operations) const {
  std::vector<std::unique_ptr<DBOperationBase>> threadStoreOps;

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
      std::optional<std::string> name = maybeName.isString()
          ? std::optional<std::string>(maybeName.asString(rt).utf8(rt))
          : std::nullopt;

      jsi::Value maybeDescription = threadObj.getProperty(rt, "description");
      std::optional<std::string> description = maybeDescription.isString()
          ? std::optional<std::string>(maybeDescription.asString(rt).utf8(rt))
          : std::nullopt;

      std::string color =
          threadObj.getProperty(rt, "color").asString(rt).utf8(rt);
      int64_t creationTime = std::stoll(
          threadObj.getProperty(rt, "creationTime").asString(rt).utf8(rt));

      jsi::Value maybeParentThreadID =
          threadObj.getProperty(rt, "parentThreadID");
      std::optional<std::string> parentThreadID = maybeParentThreadID.isString()
          ? std::optional<std::string>(
                maybeParentThreadID.asString(rt).utf8(rt))
          : std::nullopt;

      jsi::Value maybeContainingThreadID =
          threadObj.getProperty(rt, "containingThreadID");
      std::optional<std::string> containingThreadID =
          maybeContainingThreadID.isString()
          ? std::optional<std::string>(
                maybeContainingThreadID.asString(rt).utf8(rt))
          : std::nullopt;

      jsi::Value maybeCommunity = threadObj.getProperty(rt, "community");
      std::optional<std::string> community = maybeCommunity.isString()
          ? std::optional<std::string>(maybeCommunity.asString(rt).utf8(rt))
          : std::nullopt;

      std::string members =
          threadObj.getProperty(rt, "members").asString(rt).utf8(rt);
      std::string roles =
          threadObj.getProperty(rt, "roles").asString(rt).utf8(rt);
      std::string currentUser =
          threadObj.getProperty(rt, "currentUser").asString(rt).utf8(rt);

      jsi::Value maybeSourceMessageID =
          threadObj.getProperty(rt, "sourceMessageID");
      std::optional<std::string> sourceMessageID =
          maybeSourceMessageID.isString()
          ? std::optional<std::string>(
                maybeSourceMessageID.asString(rt).utf8(rt))
          : std::nullopt;

      int repliesCount =
          std::lround(threadObj.getProperty(rt, "repliesCount").asNumber());

      jsi::Value maybeAvatar = threadObj.getProperty(rt, "avatar");
      std::optional<std::string> avatar = maybeAvatar.isString()
          ? std::optional<std::string>(maybeAvatar.asString(rt).utf8(rt))
          : std::nullopt;

      jsi::Value maybePinnedCount = threadObj.getProperty(rt, "pinnedCount");
      int pinnedCount = maybePinnedCount.isNumber()
          ? std::lround(maybePinnedCount.asNumber())
          : 0;

      jsi::Value maybeTimestamps = threadObj.getProperty(rt, "timestamps");
      std::optional<std::string> timestamps = maybeTimestamps.isString()
          ? std::optional<std::string>(maybeTimestamps.asString(rt).utf8(rt))
          : std::nullopt;
      bool isBackedUp = op.getProperty(rt, "isBackedUp").asBool();

      Thread thread{
          threadID,
          type,
          name,
          description,
          color,
          creationTime,
          parentThreadID,
          containingThreadID,
          community,
          members,
          roles,
          currentUser,
          sourceMessageID,
          repliesCount,
          avatar,
          pinnedCount,
          timestamps};

      threadStoreOps.push_back(std::make_unique<ReplaceThreadOperation>(
          std::move(thread), isBackedUp));
    } else {
      throw std::runtime_error("unsupported operation: " + opType);
    }
  };
  return threadStoreOps;
}

} // namespace comm
