
#include "../cpp/CommonCpp/NativeModules/CommCoreModule.h"
#include "../cpp/CommonCpp/NativeModules/InternalModules/RustNetworkingSingleton.h"
#include "../cpp/CommonCpp/Tools/Logger.h"
#include "cxx.h"
#include <ReactCommon/TurboModuleUtils.h>
#include <future>
#include <iostream>

namespace comm {

void get42Callback(rust::String error, uint32_t counter, double ret) {
  auto it =
      RustNetworkingSingleton::instance.promises.find(counter);
  if (it == RustNetworkingSingleton::instance.promises.end()) {
    Logger::log("VARUN got not found");
    return;
  } else {
    Logger::log("VARUN got found");
    std::cout << it->first << " is " << it->second->promise;
  }

  if (error.size()) {
    std::cout << error;
    RustNetworkingSingleton::instance.rejectPromise(counter, std::string(error));
  } else {
    RustNetworkingSingleton::instance.resolvePromise(counter, jsi::Value(ret));
  }
}

} // namespace comm
