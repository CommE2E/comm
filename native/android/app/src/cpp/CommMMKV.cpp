#include "jniHelpers.h"
#include <Tools/CommMMKV.h>
#include <fbjni/fbjni.h>

using namespace facebook::jni;

class CommMMKVJavaClass : public JavaClass<CommMMKVJavaClass> {
public:
  static auto constexpr kJavaDescriptor = "Lapp/comm/android/fbjni/CommMMKV;";

  static void initialize() {
    static const auto cls = javaClassStatic();
    static auto method = cls->getStaticMethod<void()>("initialize");
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

  static bool setInt(std::string key, int value) {
    static const auto cls = javaClassStatic();
    static auto method =
        cls->getStaticMethod<jboolean(std::string, int)>("setInt");
    return method(cls, key, value);
  }

  static std::optional<int> getInt(std::string key, int noValue) {
    static const auto cls = javaClassStatic();
    static auto method =
        cls->getStaticMethod<JInteger(std::string, int)>("getInt");
    const auto result = method(cls, key, noValue);
    if (result) {
      return result->value();
    }
    return std::nullopt;
  }

  static std::vector<std::string> getAllKeys() {
    static const auto cls = javaClassStatic();
    static auto method =
        cls->getStaticMethod<JArrayClass<JString>()>("getAllKeys");
    auto methodResult = method(cls);

    std::vector<std::string> result;
    for (int i = 0; i < methodResult->size(); i++) {
      result.push_back(methodResult->getElement(i)->toStdString());
    }

    return result;
  }

  static void removeKeys(const std::vector<std::string> &keys) {
    static const auto cls = javaClassStatic();
    static auto method =
        cls->getStaticMethod<void(local_ref<JArrayClass<JString>>)>(
            "removeKeys");

    local_ref<JArrayClass<JString>> keysJava =
        JArrayClass<JString>::newArray(keys.size());

    for (int i = 0; i < keys.size(); i++) {
      keysJava->setElement(i, *make_jstring(keys[i]));
    }
    method(cls, keysJava);
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

bool CommMMKV::setInt(std::string key, int value) {
  bool result;
  NativeAndroidAccessProvider::runTask(
      [&]() { result = CommMMKVJavaClass::setInt(key, value); });
  return result;
}

std::optional<int> CommMMKV::getInt(std::string key, int noValue) {
  std::optional<int> result;
  NativeAndroidAccessProvider::runTask(
      [&]() { result = CommMMKVJavaClass::getInt(key, noValue); });
  return result;
}

std::vector<std::string> CommMMKV::getAllKeys() {
  std::vector<std::string> result;
  NativeAndroidAccessProvider::runTask(
      [&]() { result = CommMMKVJavaClass::getAllKeys(); });
  return result;
}

void CommMMKV::removeKeys(const std::vector<std::string> &keys) {
  NativeAndroidAccessProvider::runTask(
      [&]() { CommMMKVJavaClass::removeKeys(keys); });
}
} // namespace comm