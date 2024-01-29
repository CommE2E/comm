#include "SQLiteQueryExecutor.cpp"
#include "entities/Nullable.h"

#include <emscripten/bind.h>
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

  value_object<NullableString>("NullableString")
      .field("value", &NullableString::value)
      .field("isNull", &NullableString::isNull);

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
      .field("keyserverInfo", &KeyserverInfo::keyserver_info);

  value_object<WebThread>("WebThread")
      .field("id", &WebThread::id)
      .field("type", &WebThread::type)
      .field("name", &WebThread::name)
      .field("description", &WebThread::description)
      .field("color", &WebThread::color)
      .field("creationTime", &WebThread::creation_time)
      .field("parentThreadID", &WebThread::parent_thread_id)
      .field("containingThreadID", &WebThread::containing_thread_id)
      .field("community", &WebThread::community)
      .field("members", &WebThread::members)
      .field("roles", &WebThread::roles)
      .field("currentUser", &WebThread::current_user)
      .field("sourceMessageID", &WebThread::source_message_id)
      .field("repliesCount", &WebThread::replies_count)
      .field("avatar", &WebThread::avatar)
      .field("pinnedCount", &WebThread::pinned_count);

  class_<SQLiteQueryExecutor>("SQLiteQueryExecutor")
      .constructor<std::string>()
      .function("updateDraft", &SQLiteQueryExecutor::updateDraft)
      .function("moveDraft", &SQLiteQueryExecutor::moveDraft)
      .function("getAllDrafts", &SQLiteQueryExecutor::getAllDrafts)
      .function("removeAllDrafts", &SQLiteQueryExecutor::removeAllDrafts)
      .function("removeDrafts", &SQLiteQueryExecutor::removeDrafts)
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
      .function("replaceThreadWeb", &SQLiteQueryExecutor::replaceThreadWeb)
      .function("getAllThreadsWeb", &SQLiteQueryExecutor::getAllThreadsWeb)
      .function("removeAllThreads", &SQLiteQueryExecutor::removeAllThreads)
      .function("removeThreads", &SQLiteQueryExecutor::removeThreads)
      .function("replaceKeyserver", &SQLiteQueryExecutor::replaceKeyserver)
      .function("removeKeyservers", &SQLiteQueryExecutor::removeKeyservers)
      .function(
          "removeAllKeyservers", &SQLiteQueryExecutor::removeAllKeyservers)
      .function("getAllKeyservers", &SQLiteQueryExecutor::getAllKeyservers)
      .function("beginTransaction", &SQLiteQueryExecutor::beginTransaction)
      .function("commitTransaction", &SQLiteQueryExecutor::commitTransaction)
      .function(
          "rollbackTransaction", &SQLiteQueryExecutor::rollbackTransaction)
      .function(
          "restoreFromMainCompaction",
          &SQLiteQueryExecutor::restoreFromMainCompaction);
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

} // namespace internal
} // namespace emscripten
