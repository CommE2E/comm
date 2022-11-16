#pragma once

#include "rust/cxx.h"

void initialize();
rust::String getConfigParameter(rust::Str parameter);
bool isSandbox();
