#pragma once

#include "cxx.h"

namespace comm {

void secureStoreSet(rust::Str key, rust::String value);
rust::String secureStoreGet(rust::Str key);

} // namespace comm
