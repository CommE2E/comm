#include "SQLiteBackup.cpp"
#include "SQLiteQueryExecutor.cpp"
#include "SQLiteSchema.cpp"
#include "SQLiteSchemaMigrations.cpp"
#include "SQLiteUtils.cpp"
#include "WebSQLiteConnectionManager.cpp"
#include "entities/InboundP2PMessage.h"
#include "entities/OutboundP2PMessage.h"

#include <emscripten/bind.h>
#include <optional>
#include <vector>

namespace comm {

using namespace emscripten;

std::string getExceptionMessage(int exceptionPtr) {
  if (exceptionPtr == 0) {
    return std::string("Exception pointer value was null");
  }

  std::exception *e = reinterpret_cast<std::exception *>(exceptionPtr);
  if (e) {
    return std::string(e->what());
  }
  return std::string("Pointer to exception was invalid");
}

EMSCRIPTEN_BINDINGS(SQLiteQueryExecutor) {
  function("getExceptionMessage", &getExceptionMessage);

  value_object<Draft>("Draft")
      .field("key", &Draft::key)
      .field("text", &Draft::text);
  value_object<Report>("Report")
      .field("id", &Report::id)
      .field("report", &Report::report);
  value_object<PersistItem>("PersistItem")
      .field("key", &PersistItem::key)
      .field("item", &PersistItem::item);
  value_object<UserInfo>("UserInfo")
      .field("id", &UserInfo::id)
      .field("userInfo", &UserInfo::user_info);
  value_object<KeyserverInfo>("KeyserverInfo")
      .field("id", &KeyserverInfo::id)
      .field("keyserverInfo", &KeyserverInfo::keyserver_info)
      .field("syncedKeyserverInfo", &KeyserverInfo::synced_keyserver_info);
  value_object<MessageStoreThread>("MessageStoreThreads")
      .field("id", &MessageStoreThread::id)
      .field("startReached", &MessageStoreThread::start_reached);
  value_object<CommunityInfo>("CommunityInfo")
      .field("id", &CommunityInfo::id)
      .field("communityInfo", &CommunityInfo::community_info);
  value_object<IntegrityThreadHash>("IntegrityThreadHash")
      .field("id", &IntegrityThreadHash::id)
      .field("threadHash", &IntegrityThreadHash::thread_hash);
  value_object<SyncedMetadataEntry>("SyncedMetadataEntry")
      .field("name", &SyncedMetadataEntry::name)
      .field("data", &SyncedMetadataEntry::data);
  value_object<AuxUserInfo>("AuxUserInfo")
      .field("id", &AuxUserInfo::id)
      .field("auxUserInfo", &AuxUserInfo::aux_user_info);
  value_object<ThreadActivityEntry>("ThreadActivityEntry")
      .field("id", &ThreadActivityEntry::id)
      .field(
          "threadActivityStoreEntry",
          &ThreadActivityEntry::thread_activity_store_entry);
  value_object<EntryInfo>("EntryInfo")
      .field("id", &EntryInfo::id)
      .field("entry", &EntryInfo::entry);
  value_object<LocalMessageInfo>("LocalMessageInfo")
      .field("id", &LocalMessageInfo::id)
      .field("localMessageInfo", &LocalMessageInfo::local_message_info);
  value_object<DMOperation>("DMOperation")
      .field("id", &DMOperation::id)
      .field("type", &DMOperation::type)
      .field("operation", &DMOperation::operation);

  value_object<Thread>("WebClientDBThreadInfo")
      .field("id", &Thread::id)
      .field("type", &Thread::type)
      .field("name", &Thread::name)
      .field("description", &Thread::description)
      .field("color", &Thread::color)
      .field("creationTime", &Thread::creation_time)
      .field("parentThreadID", &Thread::parent_thread_id)
      .field("containingThreadID", &Thread::containing_thread_id)
      .field("community", &Thread::community)
      .field("members", &Thread::members)
      .field("roles", &Thread::roles)
      .field("currentUser", &Thread::current_user)
      .field("sourceMessageID", &Thread::source_message_id)
      .field("repliesCount", &Thread::replies_count)
      .field("avatar", &Thread::avatar)
      .field("pinnedCount", &Thread::pinned_count)
      .field("timestamps", &Thread::timestamps);

  value_object<Message>("WebMessage")
      .field("id", &Message::id)
      .field("localID", &Message::local_id)
      .field("thread", &Message::thread)
      .field("user", &Message::user)
      .field("type", &Message::type)
      .field("futureType", &Message::future_type)
      .field("content", &Message::content)
      .field("time", &Message::time);

  value_object<Media>("Media")
      .field("id", &Media::id)
      .field("container", &Media::container)
      .field("thread", &Media::thread)
      .field("uri", &Media::uri)
      .field("type", &Media::type)
      .field("extras", &Media::extras);

  value_object<MessageEntity>("MessageEntity")
      .field("message", &MessageEntity::message)
      .field("medias", &MessageEntity::medias);

  value_object<OlmPersistSession>("OlmPersistSession")
      .field("targetDeviceID", &OlmPersistSession::target_device_id)
      .field("sessionData", &OlmPersistSession::session_data)
      .field("version", &OlmPersistSession::version);

  value_object<OutboundP2PMessage>("OutboundP2PMessage")
      .field("messageID", &OutboundP2PMessage::message_id)
      .field("deviceID", &OutboundP2PMessage::device_id)
      .field("userID", &OutboundP2PMessage::user_id)
      .field("timestamp", &OutboundP2PMessage::timestamp)
      .field("plaintext", &OutboundP2PMessage::plaintext)
      .field("ciphertext", &OutboundP2PMessage::ciphertext)
      .field("status", &OutboundP2PMessage::status)
      .field("supportsAutoRetry", &OutboundP2PMessage::supports_auto_retry);

  value_object<InboundP2PMessage>("InboundP2PMessage")
      .field("messageID", &InboundP2PMessage::message_id)
      .field("senderDeviceID", &InboundP2PMessage::sender_device_id)
      .field("senderUserID", &InboundP2PMessage::sender_user_id)
      .field("plaintext", &InboundP2PMessage::plaintext)
      .field("status", &InboundP2PMessage::status);

  class_<SQLiteQueryExecutor>("SQLiteQueryExecutor")
      .constructor<std::string, bool>()
      .function("migrate", &SQLiteQueryExecutor::migrate)
      .function("updateDraft", &SQLiteQueryExecutor::updateDraft)
      .function("moveDraft", &SQLiteQueryExecutor::moveDraft)
      .function("getAllDrafts", &SQLiteQueryExecutor::getAllDrafts)
      .function("removeAllDrafts", &SQLiteQueryExecutor::removeAllDrafts)
      .function("removeDrafts", &SQLiteQueryExecutor::removeDrafts)
      .function("getInitialMessages", &SQLiteQueryExecutor::getInitialMessages)
      .function("removeAllMessages", &SQLiteQueryExecutor::removeAllMessages)
      .function("removeMessages", &SQLiteQueryExecutor::removeMessages)
      .function(
          "removeMessagesForThreads",
          &SQLiteQueryExecutor::removeMessagesForThreads)
      .function("replaceMessage", &SQLiteQueryExecutor::replaceMessage)
      .function("rekeyMessage", &SQLiteQueryExecutor::rekeyMessage)
      .function("removeAllMedia", &SQLiteQueryExecutor::removeAllMedia)
      .function(
          "removeMediaForThreads", &SQLiteQueryExecutor::removeMediaForThreads)
      .function(
          "removeMediaForMessage", &SQLiteQueryExecutor::removeMediaForMessage)
      .function(
          "removeMediaForMessages",
          &SQLiteQueryExecutor::removeMediaForMessages)
      .function("replaceMedia", &SQLiteQueryExecutor::replaceMedia)
      .function(
          "rekeyMediaContainers", &SQLiteQueryExecutor::rekeyMediaContainers)
      .function(
          "replaceMessageStoreThreads",
          &SQLiteQueryExecutor::replaceMessageStoreThreads)
      .function(
          "removeMessageStoreThreads",
          &SQLiteQueryExecutor::removeMessageStoreThreads)
      .function(
          "getAllMessageStoreThreads",
          &SQLiteQueryExecutor::getAllMessageStoreThreads)
      .function(
          "removeAllMessageStoreThreads",
          &SQLiteQueryExecutor::removeAllMessageStoreThreads)
      .function("setMetadata", &SQLiteQueryExecutor::setMetadata)
      .function("clearMetadata", &SQLiteQueryExecutor::clearMetadata)
      .function("getMetadata", &SQLiteQueryExecutor::getMetadata)
      .function("replaceReport", &SQLiteQueryExecutor::replaceReport)
      .function("removeReports", &SQLiteQueryExecutor::removeReports)
      .function("removeAllReports", &SQLiteQueryExecutor::removeAllReports)
      .function("getAllReports", &SQLiteQueryExecutor::getAllReports)
      .function(
          "setPersistStorageItem", &SQLiteQueryExecutor::setPersistStorageItem)
      .function(
          "removePersistStorageItem",
          &SQLiteQueryExecutor::removePersistStorageItem)
      .function(
          "getPersistStorageItem", &SQLiteQueryExecutor::getPersistStorageItem)
      .function("replaceUser", &SQLiteQueryExecutor::replaceUser)
      .function("removeUsers", &SQLiteQueryExecutor::removeUsers)
      .function("removeAllUsers", &SQLiteQueryExecutor::removeAllUsers)
      .function("getAllUsers", &SQLiteQueryExecutor::getAllUsers)
      .function("replaceThread", &SQLiteQueryExecutor::replaceThread)
      .function("getAllThreads", &SQLiteQueryExecutor::getAllThreads)
      .function("removeAllThreads", &SQLiteQueryExecutor::removeAllThreads)
      .function("removeThreads", &SQLiteQueryExecutor::removeThreads)
      .function("replaceKeyserver", &SQLiteQueryExecutor::replaceKeyserver)
      .function("removeKeyservers", &SQLiteQueryExecutor::removeKeyservers)
      .function(
          "removeAllKeyservers", &SQLiteQueryExecutor::removeAllKeyservers)
      .function("getAllKeyservers", &SQLiteQueryExecutor::getAllKeyservers)
      .function("replaceCommunity", &SQLiteQueryExecutor::replaceCommunity)
      .function("removeCommunities", &SQLiteQueryExecutor::removeCommunities)
      .function(
          "removeAllCommunities", &SQLiteQueryExecutor::removeAllCommunities)
      .function("getAllCommunities", &SQLiteQueryExecutor::getAllCommunities)
      .function(
          "replaceIntegrityThreadHashes",
          &SQLiteQueryExecutor::replaceIntegrityThreadHashes)
      .function(
          "removeIntegrityThreadHashes",
          &SQLiteQueryExecutor::removeIntegrityThreadHashes)
      .function(
          "removeAllIntegrityThreadHashes",
          &SQLiteQueryExecutor::removeAllIntegrityThreadHashes)
      .function(
          "getAllIntegrityThreadHashes",
          &SQLiteQueryExecutor::getAllIntegrityThreadHashes)
      .function(
          "replaceSyncedMetadataEntry",
          &SQLiteQueryExecutor::replaceSyncedMetadataEntry)
      .function(
          "removeSyncedMetadata", &SQLiteQueryExecutor::removeSyncedMetadata)
      .function(
          "removeAllSyncedMetadata",
          &SQLiteQueryExecutor::removeAllSyncedMetadata)
      .function(
          "getAllSyncedMetadata", &SQLiteQueryExecutor::getAllSyncedMetadata)
      .function("replaceAuxUserInfo", &SQLiteQueryExecutor::replaceAuxUserInfo)
      .function("removeAuxUserInfos", &SQLiteQueryExecutor::removeAuxUserInfos)
      .function(
          "removeAllAuxUserInfos", &SQLiteQueryExecutor::removeAllAuxUserInfos)
      .function("getAllAuxUserInfos", &SQLiteQueryExecutor::getAllAuxUserInfos)
      .function(
          "replaceThreadActivityEntry",
          &SQLiteQueryExecutor::replaceThreadActivityEntry)
      .function(
          "removeThreadActivityEntries",
          &SQLiteQueryExecutor::removeThreadActivityEntries)
      .function(
          "removeAllThreadActivityEntries",
          &SQLiteQueryExecutor::removeAllThreadActivityEntries)
      .function(
          "getAllThreadActivityEntries",
          &SQLiteQueryExecutor::getAllThreadActivityEntries)
      .function("replaceEntry", &SQLiteQueryExecutor::replaceEntry)
      .function("removeEntries", &SQLiteQueryExecutor::removeEntries)
      .function("removeAllEntries", &SQLiteQueryExecutor::removeAllEntries)
      .function("getAllEntries", &SQLiteQueryExecutor::getAllEntries)
      .function(
          "replaceMessageStoreLocalMessageInfo",
          &SQLiteQueryExecutor::replaceMessageStoreLocalMessageInfo)
      .function(
          "removeMessageStoreLocalMessageInfos",
          &SQLiteQueryExecutor::removeMessageStoreLocalMessageInfos)
      .function(
          "removeAllMessageStoreLocalMessageInfos",
          &SQLiteQueryExecutor::removeAllMessageStoreLocalMessageInfos)
      .function(
          "getAllMessageStoreLocalMessageInfos",
          &SQLiteQueryExecutor::getAllMessageStoreLocalMessageInfos)
      .function("replaceDMOperation", &SQLiteQueryExecutor::replaceDMOperation)
      .function(
          "removeAllDMOperations", &SQLiteQueryExecutor::removeAllDMOperations)
      .function("removeDMOperations", &SQLiteQueryExecutor::removeDMOperations)
      .function("getAllDMOperations", &SQLiteQueryExecutor::getDMOperations)
      .function(
          "getDMOperationsByType", &SQLiteQueryExecutor::getDMOperationsByType)
      .function("beginTransaction", &SQLiteQueryExecutor::beginTransaction)
      .function("commitTransaction", &SQLiteQueryExecutor::commitTransaction)
      .function(
          "getContentAccountID", &SQLiteQueryExecutor::getContentAccountID)
      .function("getNotifsAccountID", &SQLiteQueryExecutor::getNotifsAccountID)
      .function(
          "getOlmPersistSessionsData",
          &SQLiteQueryExecutor::getOlmPersistSessionsData)
      .function(
          "getOlmPersistAccountData",
          &SQLiteQueryExecutor::getOlmPersistAccountData)
      .function(
          "storeOlmPersistSession",
          &SQLiteQueryExecutor::storeOlmPersistSession)
      .function(
          "storeOlmPersistAccount",
          &SQLiteQueryExecutor::storeOlmPersistAccount)
      .function(
          "rollbackTransaction", &SQLiteQueryExecutor::rollbackTransaction)
      .function(
          "restoreFromBackupLog", &SQLiteQueryExecutor::restoreFromBackupLog)
      .function(
          "copyContentFromDatabase",
          &SQLiteQueryExecutor::copyContentFromDatabase)
      .function(
          "addOutboundP2PMessages",
          &SQLiteQueryExecutor::addOutboundP2PMessages)
      .function(
          "removeOutboundP2PMessage",
          &SQLiteQueryExecutor::removeOutboundP2PMessage)
      .function(
          "removeAllOutboundP2PMessages",
          &SQLiteQueryExecutor::removeAllOutboundP2PMessages)
      .function(
          "getOutboundP2PMessagesByID",
          &SQLiteQueryExecutor::getOutboundP2PMessagesByID)
      .function(
          "getUnsentOutboundP2PMessages",
          &SQLiteQueryExecutor::getUnsentOutboundP2PMessages)
      .function(
          "setCiphertextForOutboundP2PMessage",
          &SQLiteQueryExecutor::setCiphertextForOutboundP2PMessage)
      .function(
          "markOutboundP2PMessageAsSent",
          &SQLiteQueryExecutor::markOutboundP2PMessageAsSent)
      .function(
          "resetOutboundP2PMessagesForDevice",
          &SQLiteQueryExecutor::resetOutboundP2PMessagesForDevice)
      .function(
          "addInboundP2PMessage", &SQLiteQueryExecutor::addInboundP2PMessage)
      .function(
          "getAllInboundP2PMessage",
          &SQLiteQueryExecutor::getAllInboundP2PMessage)
      .function(
          "removeInboundP2PMessages",
          &SQLiteQueryExecutor::removeInboundP2PMessages)
      .function(
          "getInboundP2PMessagesByID",
          &SQLiteQueryExecutor::getInboundP2PMessagesByID)
      .function("getRelatedMessages", &SQLiteQueryExecutor::getRelatedMessages)
      .function(
          "updateMessageSearchIndex",
          &SQLiteQueryExecutor::updateMessageSearchIndex)
      .function(
          "deleteMessageFromSearchIndex",
          &SQLiteQueryExecutor::deleteMessageFromSearchIndex)
      .function("searchMessages", &SQLiteQueryExecutor::searchMessages)
      .function("fetchMessages", &SQLiteQueryExecutor::fetchMessages);

  class_<SQLiteBackup>("SQLiteBackup")
      .class_function(
          "restoreFromMainCompaction",
          &SQLiteBackup::restoreFromMainCompaction);
}

} // namespace comm

namespace emscripten {
namespace internal {

template <typename T, typename Allocator>
struct BindingType<std::vector<T, Allocator>> {
  using ValBinding = BindingType<val>;
  using WireType = ValBinding::WireType;

  static WireType toWireType(const std::vector<T, Allocator> &vec) {
    std::vector<val> valVec(vec.begin(), vec.end());
    return BindingType<val>::toWireType(val::array(valVec));
  }

  static std::vector<T, Allocator> fromWireType(WireType value) {
    return vecFromJSArray<T>(ValBinding::fromWireType(value));
  }
};

template <typename T>
struct TypeID<
    T,
    typename std::enable_if_t<std::is_same<
        typename Canonicalized<T>::type,
        std::vector<
            typename Canonicalized<T>::type::value_type,
            typename Canonicalized<T>::type::allocator_type>>::value>> {
  static constexpr TYPEID get() {
    return TypeID<val>::get();
  }
};

template <typename T> struct TypeID<std::optional<T>> {
  static constexpr TYPEID get() {
    return LightTypeID<val>::get();
  }
};

template <typename T> struct TypeID<const std::optional<T>> {
  static constexpr TYPEID get() {
    return LightTypeID<val>::get();
  }
};

template <typename T> struct TypeID<std::optional<T> &> {
  static constexpr TYPEID get() {
    return LightTypeID<val>::get();
  }
};

template <typename T> struct TypeID<std::optional<T> &&> {
  static constexpr TYPEID get() {
    return LightTypeID<val>::get();
  }
};

template <typename T> struct TypeID<const std::optional<T> &> {
  static constexpr TYPEID get() {
    return LightTypeID<val>::get();
  }
};

template <typename T> struct BindingType<std::optional<T>> {
  using ValBinding = BindingType<val>;
  using WireType = ValBinding::WireType;

  static WireType toWireType(std::optional<T> const &opt) {
    if (!opt.has_value()) {
      return ValBinding::toWireType(val::null());
    }
    return ValBinding::toWireType(val(opt.value()));
  }

  static std::optional<T> fromWireType(WireType value) {
    val convertedVal = ValBinding::fromWireType(value);
    if (convertedVal.isNull() || convertedVal.isUndefined()) {
      return std::nullopt;
    }
    return std::make_optional<T>(convertedVal.as<T>());
  }
};

} // namespace internal
} // namespace emscripten
