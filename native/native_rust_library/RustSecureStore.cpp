#include "RustSecureStore.h"
#include "../cpp/CommonCpp/Tools/CommSecureStore.h"
#include "../cpp/CommonCpp/NativeModules/InternalModules/GlobalDBSingleton.h"
#include "lib.rs.h"

namespace comm {

void secureStoreSet(rust::Str key, rust::String value, size_t promise) {
  GlobalDBSingleton::instance.scheduleOrRun([=]() {
    CommSecureStore::set(std::string(key), std::string(value));
    unitPromiseResolve(promise);
  });
}

void secureStoreGet(rust::Str key, size_t promise){
  GlobalDBSingleton::instance.scheduleOrRun([=]() {
    folly::Optional<std::string> value = CommSecureStore::get(std::string(key));
    
    if(value.hasValue()){
      stringPromiseResolve(promise, value.value());
    }else{
      stringPromiseReject(promise, std::string("Value doesn't exist"));
    }
  });
}

}
