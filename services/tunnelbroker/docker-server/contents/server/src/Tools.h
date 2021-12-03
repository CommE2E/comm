#pragma once

#include <string>

#include <folly/MPMCQueue.h>

namespace comm {
namespace network {
namespace ping {

enum class ClientState {
  ONLINE,
  OFFLINE,
};

struct ClientData {
  const std::string id;
  const std::string deviceToken;

  folly::MPMCQueue<bool> pingRequests = folly::MPMCQueue<bool>(10);
  folly::MPMCQueue<bool> pingResponses = folly::MPMCQueue<bool>(10);
  ClientState lastState = ClientState::ONLINE;

  ClientData(const std::string id, const std::string deviceToken)
      : id(id), deviceToken(deviceToken) {}
};

} // namespace ping
} // namespace network
} // namespace comm
