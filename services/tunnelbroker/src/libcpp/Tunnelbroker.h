#pragma once

#include "rust/cxx.h"
#include "tunnelbroker/src/cxx_bridge.rs.h"

void initialize();
SessionSignatureResult sessionSignatureHandler(rust::Str deviceID);
NewSessionResult newSessionHandler(
    rust::Str deviceID,
    rust::Str publicKey,
    rust::Str signature,
    int32_t deviceType,
    rust::Str deviceAppVersion,
    rust::Str deviceOS,
    rust::Str notifyToken);
SessionItem getSessionItem(rust::Str sessionID);
