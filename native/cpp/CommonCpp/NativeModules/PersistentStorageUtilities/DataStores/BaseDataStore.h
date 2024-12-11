#pragma once

#include "DatabaseManager.h"
#include "GlobalDBSingleton.h"
#include "NativeModuleUtils.h"
#include "WorkerThread.h"
#include "lib.rs.h"

#include <ReactCommon/TurboModuleUtils.h>
#include <jsi/jsi.h>
#include <vector>

namespace comm {

namespace jsi = facebook::jsi;

using OperationType = const std::string;

template <typename Operation, typename Entity> class BaseDataStore {
private:
  std::shared_ptr<facebook::react::CallInvoker> jsInvoker;

public:
  BaseDataStore(std::shared_ptr<facebook::react::CallInvoker> _jsInvoker)
      : jsInvoker(_jsInvoker) {
  }

  virtual ~BaseDataStore(){};

  virtual std::vector<std::unique_ptr<Operation>>
  createOperations(jsi::Runtime &rt, const jsi::Array &operations) const = 0;

  virtual jsi::Array parseDBDataStore(
      jsi::Runtime &rt,
      std::shared_ptr<std::vector<Entity>> dataVectorPtr) const = 0;

  void processStoreOperationsSync(jsi::Runtime &rt, jsi::Array &&operations) {
    std::vector<std::unique_ptr<Operation>> storeOps;

    try {
      storeOps = createOperations(rt, operations);
    } catch (const std::exception &e) {
      throw jsi::JSError(rt, e.what());
    }

    NativeModuleUtils::runSyncOrThrowJSError<void>(rt, [&storeOps]() {
      std::string error;

      try {
        DatabaseManager::getQueryExecutor().beginTransaction();
        for (const auto &operation : storeOps) {
          operation->execute();
        }
        DatabaseManager::getQueryExecutor().commitTransaction();
      } catch (const std::exception &e) {
        error = e.what();
        DatabaseManager::getQueryExecutor().rollbackTransaction();
      }

      if (error.size()) {
        throw std::runtime_error(error);
      }
    });
  }
};

} // namespace comm
