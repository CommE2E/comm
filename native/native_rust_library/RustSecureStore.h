#pragma once

#include "cxx.h"

namespace comm {

void secureStoreSet(rust::Str key, rust::String value, size_t promise);
void secureStoreGet(rust::Str key, size_t promise);

} // namespace comm
