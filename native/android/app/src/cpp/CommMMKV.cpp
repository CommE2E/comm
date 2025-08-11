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

  static void lock() {
    static const auto cls = javaClassStatic();
    static auto method = cls->getStaticMethod<void()>("lock");
    method(cls);
  }

  static void unlock() {
    static const auto cls = javaClassStatic();
    static auto method = cls->getStaticMethod<void()>("unlock");
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
        cls->getStaticMethod<void(alias_ref<JArrayClass<JString>>)>(
            "removeKeys");

    local_ref<JArrayClass<JString>> keysJava =
        JArrayClass<JString>::newArray(keys.size());

    for (int i = 0; i < keys.size(); i++) {
      keysJava->setElement(i, *make_jstring(keys[i]));
    }
    method(cls, keysJava);
  }

  static void addElementToStringSet(std::string setKey, std::string element) {
    static const auto cls = javaClassStatic();
    static auto method = cls->getStaticMethod<void(std::string, std::string)>(
        "addElementToStringSet");
    method(cls, setKey, element);
  }

  static void
  removeElementFromStringSet(std::string setKey, std::string element) {
    static const auto cls = javaClassStatic();
    static auto method = cls->getStaticMethod<void(std::string, std::string)>(
        "removeElementFromStringSet");
    method(cls, setKey, element);
  }

  static std::vector<std::string> getStringSet(std::string setKey) {
    static const auto cls = javaClassStatic();
    static auto method =
        cls->getStaticMethod<JArrayClass<JString>(std::string)>("getStringSet");
    auto methodResult = method(cls, setKey);

    std::vector<std::string> result;
    for (int i = 0; i < methodResult->size(); i++) {
      result.push_back(methodResult->getElement(i)->toStdString());
    }

    return result;
  }

  static bool
  setStringSet(std::string key, const std::vector<std::string> &elements) {
    static const auto cls = javaClassStatic();
    static auto method = cls->getStaticMethod<jboolean(
        std::string, alias_ref<JArrayClass<JString>>)>("setStringSet");

    local_ref<JArrayClass<JString>> elementsJava =
        JArrayClass<JString>::newArray(elements.size());

    for (int i = 0; i < elements.size(); i++) {
      elementsJava->setElement(i, *make_jstring(elements[i]));
    }

    return method(cls, key, elementsJava);
  }
};

namespace comm {

void CommMMKV::initialize() {
  NativeAndroidAccessProvider::runTask(
      []() { CommMMKVJavaClass::initialize(); });
}

CommMMKV::ScopedCommMMKVLock::ScopedCommMMKVLock() {
  NativeAndroidAccessProvider::runTask([]() { CommMMKVJavaClass::lock(); });
}

CommMMKV::ScopedCommMMKVLock::~ScopedCommMMKVLock() {
  NativeAndroidAccessProvider::runTask([]() { CommMMKVJavaClass::unlock(); });
}

void CommMMKV::clearSensitiveData() {
  NativeAndroidAccessProvider::runTask(
      []() { CommMMKVJavaClass::clearSensitiveData(); });
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

void CommMMKV::addElementToStringSet(std::string setKey, std::string element) {
  NativeAndroidAccessProvider::runTask(
      [&]() { CommMMKVJavaClass::addElementToStringSet(setKey, element); });
}

void CommMMKV::removeElementFromStringSet(
    std::string setKey,
    std::string element) {
  NativeAndroidAccessProvider::runTask([&]() {
    CommMMKVJavaClass::removeElementFromStringSet(setKey, element);
  });
}

std::vector<std::string> CommMMKV::getStringSet(std::string setKey) {
  std::vector<std::string> result;
  NativeAndroidAccessProvider::runTask(
      [&]() { result = CommMMKVJavaClass::getStringSet(setKey); });
  return result;
}

bool CommMMKV::setStringSet(
    std::string key,
    const std::vector<std::string> &elements) {
  bool result;
  NativeAndroidAccessProvider::runTask(
      [&]() { result = CommMMKVJavaClass::setStringSet(key, elements); });
  return result;
}
} // namespace comm
