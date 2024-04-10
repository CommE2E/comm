#include "RustSecureStore.h"
#include "../cpp/CommonCpp/Tools/CommSecureStore.h"
#include "lib.rs.h"

namespace comm {

void secureStoreSet(rust::Str key, rust::String value) {
  CommSecureStore::set(std::string(key), std::string(value));
}

rust::String secureStoreGet(rust::Str key) {
  return rust::String(CommSecureStore::get(std::string(key)).value());
}

} // namespace comm
