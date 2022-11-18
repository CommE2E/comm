#include "GlobalNetworkSingleton.h"

namespace comm {
GlobalNetworkSingleton GlobalNetworkSingleton::instance;

NetworkModule &GlobalNetworkSingleton::networkModule() {
  static thread_local NetworkModule module;
  return module;
}

void GlobalNetworkSingleton::scheduleOrRun(
    std::function<void(NetworkModule &)> &&task) {
  if (this->thread != nullptr) {
    this->thread->scheduleTask(
        [=, task = std::move(task)]() { task(this->networkModule()); });
  } else {
    task(this->networkModule());
  }
}

void GlobalNetworkSingleton::enableMultithreading() {
  if (this->thread == nullptr) {
    this->thread = std::make_unique<WorkerThread>("network");
  }
}
} // namespace comm
