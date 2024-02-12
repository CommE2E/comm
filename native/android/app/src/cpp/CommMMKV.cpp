#include "jniHelpers.h"
#include <Tools/CommMMKV.h>
#include <fbjni/fbjni.h>

using namespace facebook::jni;

class CommMMKVJavaClass : public JavaClass<CommMMKVJavaClass> {
public:
  static auto constexpr kJavaDescriptor = "Lapp/comm/android/fbjni/CommMMKV;";

  static void initialize() {
    static const auto cls = javaClassStatic();
    static auto method = cls->getStaticMethod<void()>("initializeMMKV");
    method(cls);
  }

  static void clearSensitiveData() {
    static const auto cls = javaClassStatic();
    static auto method = cls->getStaticMethod<void()>("clearSensitiveData");
    method(cls);
  }

  static bool setString(std::string key, std::string value) {
    static const auto cls = javaClassStatic();
    static auto method =
        cls->getStaticMethod<jboolean(std::string, std::string)>("setString");
    return method(cls, key, value);
  }

  static std::optional<std::string> getString(std::string key) {
    static const auto cls = javaClassStatic();
    static auto method =
        cls->getStaticMethod<JString(std::string)>("getString");
    const auto result = method(cls, key);
    if (result) {
      return result->toStdString();
    }
    return std::nullopt;
  }
};

namespace comm {

void CommMMKV::initialize() {
  NativeAndroidAccessProvider::runTask(
      [=]() { CommMMKVJavaClass::initialize(); });
}

void CommMMKV::clearSensitiveData() {
  NativeAndroidAccessProvider::runTask(
      [=]() { CommMMKVJavaClass::clearSensitiveData(); });
}

bool CommMMKV::setString(std::string key, std::string value) {
  bool result;
  NativeAndroidAccessProvider::runTask(
      [&]() { result = CommMMKVJavaClass::setString(key, value); });
  return result;
}

std::optional<std::string> CommMMKV::getString(std::string key) {
  std::optional<std::string> result;
  NativeAndroidAccessProvider::runTask(
      [&]() { result = CommMMKVJavaClass::getString(key); });
  return result;
}

} // namespace comm