#include <Tools/Logger.h>
#include <Tools/WorkerThread.h>
#include <sstream>

namespace comm {

WorkerThread::WorkerThread(const std::string name)
    : tasks(folly::MPMCQueue<std::unique_ptr<taskType>>(100)), name(name) {
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
  this->thread = std::make_unique<std::thread>(job);
}

void WorkerThread::scheduleTask(const taskType task) {
  if (!this->tasks.write(std::make_unique<taskType>(std::move(task)))) {
    throw std::runtime_error(
        "Error scheduling task on the " + this->name + " worker thread");
  }
}

WorkerThread::~WorkerThread() {
  this->tasks.blockingWrite(nullptr);
  try {
    this->thread->join();
  } catch (const std::system_error &error) {
    std::ostringstream stringStream;
    stringStream << "Error occurred joining the " + this->name +
            " worker thread: "
                 << error.what();
    Logger::log(stringStream.str());
  }
}

} // namespace comm
