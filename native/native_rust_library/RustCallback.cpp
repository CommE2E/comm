
#include "../cpp/CommonCpp/NativeModules/CommCoreModule.h"
#include "../cpp/CommonCpp/NativeModules/InternalModules/RustNetworkingSingleton.h"
#include "../cpp/CommonCpp/Tools/Logger.h"
#include "cxx.h"
#include <ReactCommon/TurboModuleUtils.h>
#include <future>
#include <iostream>

namespace comm {

void get42Callback(rust::String error, uint32_t counter, double ret) {
  std::unordered_map<uint32_t, std::shared_ptr<Promise>>::const_iterator got =
      RustNetworkingSingleton::instance.promises.find(counter);
  if (got == RustNetworkingSingleton::instance.promises.end()) {
    Logger::log("VARUN got not found");
    return;
  } else {
    Logger::log("VARUN got found");
    std::cout << got->first << " is " << got->second;
  }

  if (error.size()) {
    std::cout << error;
    got->second->reject(std::string(error));
  } else {
    got->second->resolve(jsi::Value(ret));
  }
}

} // namespace comm
