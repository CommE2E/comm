#include "TalkBetweenServicesReactor.h"

#include <iostream>
#include <thread>

namespace comm {
namespace network {
namespace reactor {

void TalkBetweenServicesReactor::scheduleMessage(
    std::unique_ptr<std::string> msg) {
  const size_t size = msg->size();
  std::cout << "[" << std::hash<std::thread::id>{}(std::this_thread::get_id())
            << "]"
            << "[TalkBetweenServicesReactor::scheduleMessage] schedulING "
            << size << std::endl;
  this->messages.enqueue(std::move(*msg));
  std::cout << "[" << std::hash<std::thread::id>{}(std::this_thread::get_id())
            << "]"
            << "[TalkBetweenServicesReactor::scheduleMessage] schedulED "
            << size << std::endl;
}

std::unique_ptr<grpc::Status> TalkBetweenServicesReactor::prepareRequest(
    inner::TalkBetweenServicesRequest &request,
    std::shared_ptr<inner::TalkBetweenServicesResponse> previousResponse) {
  std::string msg;
  std::cout << "[" << std::hash<std::thread::id>{}(std::this_thread::get_id())
            << "]"
            << "[TalkBetweenServicesReactor::prepareRequest] read block "
            << this->messages.size() << std::endl;
  msg = this->messages.dequeue();
  std::cout << "[" << std::hash<std::thread::id>{}(std::this_thread::get_id())
            << "]"
            << "[TalkBetweenServicesReactor::prepareRequest] read unblock "
            << this->messages.size() << "/" << msg.size() << std::endl;
  // flow is lost after this place
  if (msg.empty()) {
    return std::make_unique<grpc::Status>(grpc::Status::OK);
  }
  request.set_msg(msg);
  return nullptr;
}

void TalkBetweenServicesReactor::doneCallback() {
  this->terminationNotifier->notify_one();
}

} // namespace reactor
} // namespace network
} // namespace comm
