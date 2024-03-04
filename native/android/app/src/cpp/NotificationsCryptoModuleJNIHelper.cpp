#include <Notifications/BackgroundDataStorage/NotificationsCryptoModule.h>
#include <Notifications/BackgroundDataStorage/NotificationsCryptoModuleJNIHelper.h>

namespace comm {
int NotificationsCryptoModuleJNIHelper::olmEncryptedTypeMessage(
    facebook::jni::alias_ref<NotificationsCryptoModuleJNIHelper> jThis) {
  return NotificationsCryptoModule::olmEncryptedTypeMessage;
}

std::string NotificationsCryptoModuleJNIHelper::decrypt(
    facebook::jni::alias_ref<NotificationsCryptoModuleJNIHelper> jThis,
    std::string keyserverID,
    std::string data,
    int messageType) {
  std::string decryptedData =
      NotificationsCryptoModule::decrypt(keyserverID, data, messageType);
  return decryptedData;
}

void NotificationsCryptoModuleJNIHelper::registerNatives() {
  javaClassStatic()->registerNatives({
      makeNativeMethod(
          "olmEncryptedTypeMessage",
          NotificationsCryptoModuleJNIHelper::olmEncryptedTypeMessage),
      makeNativeMethod("decrypt", NotificationsCryptoModuleJNIHelper::decrypt),
  });
}
} // namespace comm
