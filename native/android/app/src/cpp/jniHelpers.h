#pragma once

#include <fbjni/fbjni.h>
#include <string>

namespace comm {

namespace jni = facebook::jni;

struct HashMap
    : jni::JavaClass<HashMap, jni::JMap<jni::JString, jni::JObject>> {
  static constexpr auto kJavaDescriptor = "Ljava/util/HashMap;";

  jni::local_ref<jni::JObject> get(const std::string &key) {
    static auto method = getClass()
                             ->getMethod<jni::local_ref<jni::JObject>(
                                 jni::local_ref<jni::JObject>)>("get");
    return method(self(), jni::make_jstring(key));
  }
};

struct Runnable : public jni::JavaClass<Runnable> {
  static constexpr auto kJavaDescriptor = "Ljava/lang/Runnable;";
  void run() {
    static const auto method =
        jni::findClassStatic("java/lang/Runnable")->getMethod<void()>("run");
    method(this->self());
  }
};

} // namespace comm
