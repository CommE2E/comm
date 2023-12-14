#include "RustCSAMetadataEmitter.h"
#include "../cpp/CommonCpp/NativeModules/CommServicesAuthMetadataEmitter.h"

namespace comm {
void sendAuthMetadataToJS(
    rust::String accessToken,
    rust::String userID,
    rust::String deviceID) {
  CommServicesAuthMetadataEmitter::sendAuthMetadataToJS(
      accessToken, userID, deviceID);
}
} // namespace comm
