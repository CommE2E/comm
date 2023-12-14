#include "RustCSAMetadataEmitter.h"
#include "../cpp/CommonCpp/NativeModules/CommServicesAuthMetadataEmitter.h"

namespace comm {
void sendAuthMetadataToJS(rust::String accessToken, rust::String userID) {
  CommServicesAuthMetadataEmitter::sendAuthMetadataToJS(accessToken, userID);
}
} // namespace comm
