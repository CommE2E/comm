#pragma once

#include <cxx.h>
#include <jsi/jsi.h>

rust::String jsiStringToRustString(
    const facebook::jsi::String &jsi_string,
    facebook::jsi::Runtime &runtime);

rust::Vec<rust::String> jsiStringArrayToRustVec(
    const facebook::jsi::Array &jsi_array,
    facebook::jsi::Runtime &runtime);
