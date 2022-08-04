#include "TalkBetweenServicesReactor.h"

#include <thread>

namespace comm {
namespace network {
namespace reactor {

void TalkBetweenServicesReactor::scheduleMessage(
    std::unique_ptr<std::string> msg) {
  const size_t size = msg->size();
  LOG(INFO) << "[" << std::hash<std::thread::id>{}(std::this_thread::get_id())
            << "]"
            << "[TalkBetweenServicesReactor::scheduleMessage] schedulING "
            << size;
  if (!this->messages.write(std::move(*msg))) {
    throw std::runtime_error(
        "Error scheduling sending a msg to send to the blob service");
  }
  LOG(INFO) << "[" << std::hash<std::thread::id>{}(std::this_thread::get_id())
            << "]"
            << "[TalkBetweenServicesReactor::scheduleMessage] schedulED "
            << size;
}

std::unique_ptr<grpc::Status> TalkBetweenServicesReactor::prepareRequest(
    inner::TalkBetweenServicesRequest &request,
    std::shared_ptr<inner::TalkBetweenServicesResponse> previousResponse) {
  std::string msg;
  LOG(INFO) << "[" << std::hash<std::thread::id>{}(std::this_thread::get_id())
            << "]"
            << "[TalkBetweenServicesReactor::prepareRequest] read block";
  this->messages.blockingRead(msg);
  LOG(INFO) << "[" << std::hash<std::thread::id>{}(std::this_thread::get_id())
            << "]"
            << "[TalkBetweenServicesReactor::prepareRequest] read unblock "
            << msg.size();
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
