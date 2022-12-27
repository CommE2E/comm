#pragma once

#include <fbjni/NativeRunnable.h>
#include <fbjni/fbjni.h>
#include <jniHelpers.h>

namespace comm {
class RustNetworkingSingletonJNIHelper
    : public facebook::jni::JavaClass<RustNetworkingSingletonJNIHelper> {
public:
  static auto constexpr kJavaDescriptor =
      "Lapp/comm/android/fbjni/RustNetworkingSingleton;";
  static void schedule(
      facebook::jni::alias_ref<RustNetworkingSingletonJNIHelper> jThis,
      facebook::jni::alias_ref<Runnable> task);
  static void enableMultithreading(
      facebook::jni::alias_ref<RustNetworkingSingletonJNIHelper> jThis);
  static void registerNatives();
};
} // namespace comm
