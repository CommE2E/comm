#include <InternalModules/GlobalDBSingleton.h>

namespace comm {
GlobalDBSingleton GlobalDBSingleton::instance;

GlobalDBSingleton::GlobalDBSingleton()
    : multithreadingEnabled(true),
      databaseThread(std::make_unique<WorkerThread>("database")) {
}

void GlobalDBSingleton::scheduleOrRun(const taskType task) {
  this->scheduleOrRunCommonImpl(task);
}

void GlobalDBSingleton::enableMultithreading() {
  this->enableMultithreadingCommonImpl();
}
} // namespace comm
