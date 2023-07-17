#include "../../native/cpp/CommonCpp/DatabaseManagers/SQLiteQueryExecutor.cpp"
#include <emscripten/bind.h>
#include <vector>

namespace comm {

using namespace emscripten;

EMSCRIPTEN_BINDINGS(SQLiteQueryExecutor) {
  value_object<Draft>("Draft")
      .field("key", &Draft::key)
      .field("text", &Draft::text);
  value_object<Report>("Report")
      .field("id", &Report::id)
      .field("report", &Report::report);
  value_object<PersistItem>("PersistItem")
      .field("key", &PersistItem::key)
      .field("item", &PersistItem::item);

  class_<SQLiteQueryExecutor>("SQLiteQueryExecutor")
      .constructor<std::string>()
      .function("updateDraft", &SQLiteQueryExecutor::updateDraft)
      .function("moveDraft", &SQLiteQueryExecutor::moveDraft)
      .function("getAllDrafts", &SQLiteQueryExecutor::getAllDrafts)
      .function("removeAllDrafts", &SQLiteQueryExecutor::removeAllDrafts)
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
          "getPersistStorageItem", &SQLiteQueryExecutor::getPersistStorageItem);
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
