#include "jniHelpers.h"
#include <NativeModules/CommServicesAuthMetadataEmitter.h>
#include <fbjni/fbjni.h>

using namespace facebook::jni;

class CommServicesAuthMetadataEmitterJavaClass
    : public JavaClass<CommServicesAuthMetadataEmitterJavaClass> {
public:
  static auto constexpr kJavaDescriptor =
      "Lapp/comm/android/commservices/CommServicesAuthMetadataEmitter;";

  static void sendAuthMetadataToJS(
      rust::String accessToken,
      rust::String userID,
      rust::String deviceID) {

    static const auto cls = javaClassStatic();
    static auto method =
        cls->getStaticMethod<void(std::string, std::string, std::string)>(
            "sendAuthMetadataToJS");
    method(
        cls,
        std::string(accessToken),
        std::string(userID),
        std::string(deviceID));
  }
};

namespace comm {
void CommServicesAuthMetadataEmitter::sendAuthMetadataToJS(
    rust::String accessToken,
    rust::String userID,
    rust::String deviceID) {
  NativeAndroidAccessProvider::runTask([&]() {
    CommServicesAuthMetadataEmitterJavaClass::sendAuthMetadataToJS(
        accessToken, userID, deviceID);
  });
}
} // namespace comm
