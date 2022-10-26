#pragma once

#include "rust/cxx.h"
#include "tunnelbroker/src/cxx_bridge.rs.h"

void initialize();
rust::String getConfigParameter(rust::Str parameter);
bool isSandbox();
SessionSignatureResult sessionSignatureHandler(rust::Str deviceID);
