#pragma once

#include "cxx.h"

namespace comm {

void stringCallback(rust::String error, uint32_t promiseID, rust::String ret);
void voidCallback(rust::String error, uint32_t promiseID);

} // namespace comm
