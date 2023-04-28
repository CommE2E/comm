#include "JSIRust.h"
#include <string>

rust::String jsiStringToRustString(
    const facebook::jsi::String &jsi_string,
    facebook::jsi::Runtime &runtime) {
  std::string std_string = jsi_string.utf8(runtime);
  return rust::String(std_string);
}

rust::Vec<rust::String> jsiStringArrayToRustVec(
    const facebook::jsi::Array &jsi_array,
    facebook::jsi::Runtime &runtime) {
  rust::Vec<rust::String> rust_vec;
  rust_vec.reserve(jsi_array.size(runtime));

  for (size_t i = 0; i < jsi_array.size(runtime); ++i) {
    facebook::jsi::String jsi_string =
        jsi_array.getValueAtIndex(runtime, i).getString(runtime);
    rust::String rust_string = jsiStringToRustString(jsi_string, runtime);
    rust_vec.push_back(rust_string);
  }

  return rust_vec;
}
