#pragma once

#include "ServiceBlobClient.h"

#include "../_generated/outer.grpc.pb.h"
#include "../_generated/outer.pb.h"

#include "ServerBidiReactorBase.h"

#include <condition_variable>
#include <memory>
#include <mutex>
#include <string>

namespace comm {
namespace network {
namespace reactor {

class TalkWithClientReactor : public reactor::ServerBidiReactorBase<
                                  outer::TalkWithClientRequest,
                                  outer::TalkWithClientResponse> {
  reactor::TalkBetweenServicesReactor talkReactor;

  std::mutex reactorStateMutex;
  std::thread clientThread;

  std::condition_variable blobPutDoneCV;
  std::mutex blobPutDoneCVMutex;

  std::string generateBackupID();

public:
  std::unique_ptr<reactor::ServerBidiReactorStatus> handleRequest(
      outer::TalkWithClientRequest request,
      outer::TalkWithClientResponse *response) override {
    LOG(INFO) << "[" << std::hash<std::thread::id>{}(std::this_thread::get_id())
              << "]"
              << "[TalkWithClientReactor::handleRequest]";
    // we make sure that the blob client's state is flushed to the main memory
    // as there may be multiple threads from the pool taking over here
    const std::lock_guard<std::mutex> lock(this->reactorStateMutex);
    std::string msg = request.msg();
    LOG(INFO) << "[" << std::hash<std::thread::id>{}(std::this_thread::get_id())
              << "]"
              << "[TalkWithClientReactor::handleRequest] msg " << msg.size();
    if (!this->talkReactor.initialized) {
      LOG(INFO)
          << "[" << std::hash<std::thread::id>{}(std::this_thread::get_id())
          << "]"
          << "[TalkWithClientReactor::handleRequest] initializING talk reactor";
      this->talkReactor =
          reactor::TalkBetweenServicesReactor(&this->blobPutDoneCV);
      LOG(INFO) << "["
                << std::hash<std::thread::id>{}(std::this_thread::get_id())
                << "]"
                << "[TalkWithClientReactor::handleRequest] initializING talk "
                   "reactor2";
      this->clientThread =
          ServiceBlobClient::getInstance().talk(this->talkReactor);
      LOG(INFO)
          << "[" << std::hash<std::thread::id>{}(std::this_thread::get_id())
          << "]"
          << "[TalkWithClientReactor::handleRequest] initializED talk reactor";
    }
    LOG(INFO) << "[" << std::hash<std::thread::id>{}(std::this_thread::get_id())
              << "]"
              << "[TalkWithClientReactor::handleRequest] schedulING msg "
              << msg.size();
    this->talkReactor.scheduleMessage(std::make_unique<std::string>(msg));
    LOG(INFO) << "[" << std::hash<std::thread::id>{}(std::this_thread::get_id())
              << "]"
              << "[TalkWithClientReactor::handleRequest] schedulED msg "
              << msg.size();
    return nullptr;
  }

  void terminateCallback() override {
    LOG(INFO) << "[" << std::hash<std::thread::id>{}(std::this_thread::get_id())
              << "]"
              << "[TalkWithClientReactor::terminateCallback]";
    const std::lock_guard<std::mutex> lock(this->reactorStateMutex);
    if (!this->talkReactor.initialized) {
      return;
    }
    this->talkReactor.scheduleMessage(std::make_unique<std::string>(""));
    std::unique_lock<std::mutex> lock2(this->blobPutDoneCVMutex);
    LOG(INFO) << "[" << std::hash<std::thread::id>{}(std::this_thread::get_id())
              << "]"
              << "[TalkWithClientReactor::terminateCallback] waitING";
    this->blobPutDoneCV.wait(lock2);
    LOG(INFO) << "[" << std::hash<std::thread::id>{}(std::this_thread::get_id())
              << "]"
              << "[TalkWithClientReactor::terminateCallback] waitED";
    if (!this->talkReactor.getStatusHolder()->getStatus().ok()) {
      throw std::runtime_error(
          this->talkReactor.getStatusHolder()->getStatus().error_message());
    }
    this->clientThread.join();
  }
};

} // namespace reactor
} // namespace network
} // namespace comm
