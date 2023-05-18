#pragma once

#include <fbjni/fbjni.h>

namespace comm {
class NotificationsCryptoModuleJNIHelper
    : public facebook::jni::JavaClass<NotificationsCryptoModuleJNIHelper> {
public:
  static auto constexpr kJavaDescriptor =
      "Lapp/comm/android/fbjni/NotificationsCryptoModule;";

  static int olmEncryptedTypeMessage(
      facebook::jni::alias_ref<NotificationsCryptoModuleJNIHelper> jThis);

  static std::string decrypt(
      facebook::jni::alias_ref<NotificationsCryptoModuleJNIHelper> jThis,
      std::string data,
      int messageType,
      std::string callingProcessName);

  static void registerNatives();
};
} // namespace comm