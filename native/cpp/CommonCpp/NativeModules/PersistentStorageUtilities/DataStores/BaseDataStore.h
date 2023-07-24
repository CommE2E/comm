#pragma once

#include "DatabaseManager.h"
#include "GlobalDBSingleton.h"
#include "NativeModuleUtils.h"
#include "WorkerThread.h"

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

  jsi::Value processStoreOperations(jsi::Runtime &rt, jsi::Array &&operations) {
    std::string createOperationsError;
    std::shared_ptr<std::vector<std::unique_ptr<Operation>>> storeOpsPtr;

    try {
      auto storeOps = createOperations(rt, operations);
      storeOpsPtr = std::make_shared<std::vector<std::unique_ptr<Operation>>>(
          std::move(storeOps));
    } catch (std::runtime_error &e) {
      createOperationsError = e.what();
    }

    return facebook::react::createPromiseAsJSIValue(
        rt,
        [=](jsi::Runtime &innerRt,
            std::shared_ptr<facebook::react::Promise> promise) {
          taskType job = [=]() {
            std::string error = createOperationsError;

            if (!error.size()) {
              try {
                DatabaseManager::getQueryExecutor().beginTransaction();
                for (const auto &operation : *storeOpsPtr) {
                  operation->execute();
                }
                DatabaseManager::getQueryExecutor().commitTransaction();
              } catch (std::system_error &e) {
                error = e.what();
                DatabaseManager::getQueryExecutor().rollbackTransaction();
              }
            }

            this->jsInvoker->invokeAsync([=]() {
              if (error.size()) {
                promise->reject(error);
              } else {
                promise->resolve(jsi::Value::undefined());
              }
            });
          };
          GlobalDBSingleton::instance.scheduleOrRunCancellable(
              job, promise, this->jsInvoker);
        });
  }

  void processStoreOperationsSync(jsi::Runtime &rt, jsi::Array &&operations) {
    std::vector<std::unique_ptr<Operation>> storeOps;

    try {
      storeOps = createOperations(rt, operations);
    } catch (const std::exception &e) {
      throw jsi::JSError(rt, e.what());
    }

    NativeModuleUtils::runSyncOrThrowJSError<void>(rt, [&storeOps]() {
      try {
        DatabaseManager::getQueryExecutor().beginTransaction();
        for (const auto &operation : storeOps) {
          operation->execute();
        }
        DatabaseManager::getQueryExecutor().commitTransaction();
      } catch (const std::exception &e) {
        DatabaseManager::getQueryExecutor().rollbackTransaction();
        throw e;
      }
    });
  }
};

} // namespace comm
