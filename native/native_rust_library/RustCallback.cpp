
#include "RustCallback.h"
#include "../cpp/CommonCpp/NativeModules/CommCoreModule.h"
#include "../cpp/CommonCpp/NativeModules/InternalModules/RustPromiseManager.h"
#include "../cpp/CommonCpp/Tools/Logger.h"
#include <ReactCommon/TurboModuleUtils.h>
#include <future>
#include <iostream>

namespace comm {

void stringCallback(rust::String error, uint32_t counter, rust::String ret) {
  auto it = RustPromiseManager::instance.promises.find(counter);
  if (it == RustPromiseManager::instance.promises.end()) {
    return;
  }

  if (error.size()) {
    RustPromiseManager::instance.rejectPromise(counter, std::string(error));
  } else {
    folly::dynamic retDyn;
    retDyn = std::string(ret);
    RustPromiseManager::instance.resolvePromise(counter, retDyn);
  }
}

} // namespace comm
