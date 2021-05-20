#include "DatabaseThread.h"
#include "Logger.h"
#include <sstream>

namespace comm {

DatabaseThread::DatabaseThread()
    : tasks(folly::MPMCQueue<std::unique_ptr<taskType>>(20)) {
  auto job = [this]() {
    while (true) {
      std::unique_ptr<taskType> lastTask;
      this->tasks.blockingRead(lastTask);
      if (lastTask == nullptr) {
        break;
      }
      (*lastTask)();
    }
  };
  thread = std::make_unique<std::thread>(job);
}

void DatabaseThread::scheduleTask(const taskType task) {
  if (!tasks.write(std::make_unique<taskType>(std::move(task)))) {
    throw std::runtime_error("Error scheduling task on Database thread");
  }
}

DatabaseThread::~DatabaseThread() {
  this->tasks.blockingWrite(nullptr);
  try {
    thread->join();
  } catch (const std::system_error &error) {
    std::ostringstream stringStream;
    stringStream << "Error occurred joining the Database thread: "
                 << error.what();
    Logger::log(stringStream.str());
  }
}

} // namespace comm
