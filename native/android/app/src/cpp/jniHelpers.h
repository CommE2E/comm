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

struct NativeAndroidAccessible {
  static void runTask(std::function<void()> &&task) {
    // Some methods are meant to be executed on auxiliary threads. In case they
    // require access to native Java API we need to temporarily attach the
    // thread to JVM This function attaches thread to JVM for the time lambda
    // passed to this function will be executing.
    jni::ThreadScope::WithClassLoader(std::move(task));
  }
};

} // namespace comm
