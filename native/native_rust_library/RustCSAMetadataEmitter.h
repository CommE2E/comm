#pragma once

#include "cxx.h"

namespace comm {

void sendAuthMetadataToJS(rust::String accessToken, rust::String userID);

} // namespace comm
