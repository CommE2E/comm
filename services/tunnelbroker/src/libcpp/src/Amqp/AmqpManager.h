#pragma once

#include "DatabaseManager.h"

#include <amqpcpp.h>
#include <amqpcpp/libuv.h>

#include <atomic>
#include <memory>
#include <mutex>
#include <string>

namespace comm {
namespace network {

class AmqpManager {
  AmqpManager(){};

  std::mutex channelMutex;
  std::once_flag initOnceFlag;
  std::unique_ptr<AMQP::TcpChannel> amqpChannel;
  std::atomic<bool> amqpReady;
  std::atomic<std::size_t> reconnectAttempt;
  void connectInternal();
  void connect();
  void waitUntilReady();

public:
  static AmqpManager &getInstance();
  void init();
  bool send(const database::MessageItem *message);
  void ack(uint64_t deliveryTag);

  AmqpManager(AmqpManager const &) = delete;
  void operator=(AmqpManager const &) = delete;
};

} // namespace network
} // namespace comm
