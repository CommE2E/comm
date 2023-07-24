#pragma once

#include "InternalModules/GlobalDBSingleton.h"

#include <jsi/jsi.h>
#include <future>

namespace comm {

namespace jsi = facebook::jsi;

class NativeModuleUtils {
public:
  template <class T>
  static T runSyncOrThrowJSError(jsi::Runtime &rt, std::function<T()> task) {
    std::promise<T> promise;
    GlobalDBSingleton::instance.scheduleOrRunCancellable([&promise, &task]() {
      try {
        if constexpr (std::is_void<T>::value) {
          task();
          promise.set_value();
        } else {
          promise.set_value(task());
        }
      } catch (const std::exception &e) {
        promise.set_exception(std::make_exception_ptr(e));
      }
    });
    // We cannot instantiate JSError on database thread, so
    // on the main thread we re-throw C++ error, catch it and
    // transform to informative JSError on the main thread
    try {
      return promise.get_future().get();
    } catch (const std::exception &e) {
      throw jsi::JSError(rt, e.what());
    }
  }
};

} // namespace comm
