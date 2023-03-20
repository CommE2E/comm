
#include "RustCallback.h"
#include "../cpp/CommonCpp/NativeModules/CommCoreModule.h"
#include "../cpp/CommonCpp/NativeModules/InternalModules/RustPromiseManager.h"
#include "../cpp/CommonCpp/Tools/Logger.h"
#include <ReactCommon/TurboModuleUtils.h>
#include <future>
#include <iostream>

namespace comm {

void get42Callback(rust::String error, uint32_t counter, double ret) {
  auto it = RustPromiseManager::instance.promises.find(counter);
  if (it == RustPromiseManager::instance.promises.end()) {
    Logger::log("VARUN got not found");
    return;
  } else {
    Logger::log("VARUN got found");
  }

  if (error.size()) {
    std::cout << error;
    RustPromiseManager::instance.rejectPromise(counter, std::string(error));
  } else {
    folly::dynamic retDyn;
    retDyn = ret;
    if (retDyn.isDouble()) {
      Logger::log("retDyn: " + retDyn.asString() + "!");
    } else {
      Logger::log(retDyn.typeName());
    }
    RustPromiseManager::instance.resolvePromise(counter, retDyn);
  }
}

} // namespace comm
