#include "jniHelpers.h"
#include <Tools/CommSecureStore.h>
#include <fbjni/fbjni.h>

using namespace facebook::jni;

class CommSecureStoreJavaClass : public JavaClass<CommSecureStoreJavaClass> {
public:
  static auto constexpr kJavaDescriptor =
      "Lapp/comm/android/fbjni/CommSecureStore;";

  static void set(std::string key, std::string value) {
    static const auto cls = javaClassStatic();
    static auto method =
        cls->getStaticMethod<void(std::string, std::string)>("set");
    method(cls, key, value);
  }

  static folly::Optional<std::string> get(std::string key) {
    static const auto cls = javaClassStatic();
    static auto method =
        cls->getStaticMethod<facebook::jni::JString(std::string)>("get");
    const auto result = method(cls, key);
    return (result) ? folly::Optional<std::string>(result->toStdString())
                    : folly::none;
  }
};

namespace comm {

void CommSecureStore::set(const std::string key, const std::string value)
    const {
  NativeAndroidAccessProvider::runTask(
      [=]() { CommSecureStoreJavaClass::set(key, value); });
}

folly::Optional<std::string> CommSecureStore::get(const std::string key) const {
  folly::Optional<std::string> value;
  NativeAndroidAccessProvider::runTask(
      [=, &value]() { value = CommSecureStoreJavaClass::get(key); });
  return value;
}

} // namespace comm
