#pragma once

#include <fbjni/fbjni.h>

namespace comm {
class CommMMKVJNIHelper : public facebook::jni::JavaClass<CommMMKVJNIHelper> {
public:
  static auto constexpr kJavaDescriptor = "Lapp/comm/android/fbjni/CommMMKV;";
  static std::string notifsStorageUnreadThickThreadsKey(
      facebook::jni::alias_ref<CommMMKVJNIHelper> jThis);
  static void registerNatives();
};
} // namespace comm
