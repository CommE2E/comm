#pragma once

#include <fbjni/NativeRunnable.h>
#include <fbjni/fbjni.h>
#include <jniHelpers.h>

namespace comm {
class GlobalDBSingletonJNIHelper
    : public facebook::jni::JavaClass<GlobalDBSingletonJNIHelper> {
public:
  static auto constexpr kJavaDescriptor =
      "Lapp/comm/android/fbjni/GlobalDBSingleton;";
  static void scheduleOrRun(
      facebook::jni::alias_ref<GlobalDBSingletonJNIHelper> jThis,
      facebook::jni::alias_ref<Runnable> task);
  static void enableMultithreading(
      facebook::jni::alias_ref<GlobalDBSingletonJNIHelper> jThis);
  static void registerNatives();
};
} // namespace comm
