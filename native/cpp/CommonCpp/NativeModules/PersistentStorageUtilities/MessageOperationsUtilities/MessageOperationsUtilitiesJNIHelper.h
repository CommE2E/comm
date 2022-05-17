#pragma once

#include <fbjni/fbjni.h>

namespace comm {
class MessageOperationsUtilitiesJNIHelper
    : public facebook::jni::JavaClass<MessageOperationsUtilitiesJNIHelper> {
public:
  static auto constexpr kJavaDescriptor =
      "Lapp/comm/android/fbjni/MessageOperationsUtilities;";

  static void storeMessageInfos(
      facebook::jni::alias_ref<MessageOperationsUtilitiesJNIHelper> jThis,
      facebook::jni::JString sqliteFilePath,
      facebook::jni::JString rawMessageInfosString);
  static void registerNatives();
};
} // namespace comm
