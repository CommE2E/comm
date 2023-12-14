#pragma once

#include "cxx.h"

namespace comm {

class CommServicesAuthMetadataEmitter {
public:
  static void sendAuthMetadataToJS(
      rust::String accessToken,
      rust::String userID,
      rust::String deviceID);
};

} // namespace comm
