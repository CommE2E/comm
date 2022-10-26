#pragma once

#include "rust/cxx.h"
#include "tunnelbroker/src/cxx_bridge.rs.h"

void initialize();
SessionSignatureResult sessionSignatureHandler(rust::Str deviceID);
