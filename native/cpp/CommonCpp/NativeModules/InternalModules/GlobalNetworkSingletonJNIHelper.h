#pragma once

#include <fbjni/fbjni.h>

namespace comm {
class GlobalNetworkSingletonJNIHelper
    : public facebook::jni::JavaClass<GlobalNetworkSingletonJNIHelper> {
public:
  static auto constexpr kJavaDescriptor =
      "Lapp/comm/android/fbjni/NetworkModule;";
  static void registerNatives();
};
} // namespace comm
