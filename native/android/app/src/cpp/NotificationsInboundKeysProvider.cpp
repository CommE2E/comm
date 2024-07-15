#include "jniHelpers.h"
#include <Notifications/BackgroundDataStorage/NotificationsInboundKeysProvider.h>
#include <fbjni/fbjni.h>

using namespace facebook::jni;

class NotificationsInboundKeysProviderJavaClass
    : public JavaClass<NotificationsInboundKeysProviderJavaClass> {
public:
  static auto constexpr kJavaDescriptor =
      "Lapp/comm/android/fbjni/NotificationsInboundKeysProvider;";

  static std::string getNotifsInboundKeysForDeviceID(std::string deviceID) {
    static const auto cls = javaClassStatic();
    static auto method = cls->getStaticMethod<JString(std::string)>(
        "getNotifsInboundKeysForDeviceID");
    const auto result = method(cls, deviceID);
    return result->toStdString();
  }
};

namespace comm {
std::string NotificationsInboundKeysProvider::getNotifsInboundKeysForDeviceID(
    const std::string &deviceID) {
  std::string result;
  NativeAndroidAccessProvider::runTask([&]() {
    result = NotificationsInboundKeysProviderJavaClass::
        getNotifsInboundKeysForDeviceID(deviceID);
  });
  return result;
}
} // namespace comm