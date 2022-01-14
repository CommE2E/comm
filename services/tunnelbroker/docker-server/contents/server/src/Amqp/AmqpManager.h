#pragma once

#include "Constants.h"
#include <boost/asio/deadline_timer.hpp>
#include <boost/asio/io_service.hpp>
#include <boost/asio/strand.hpp>

#include <amqpcpp.h>
#include <amqpcpp/libboostasio.h>
#include <string.h>

class AmqpManager {
private:
  static AmqpManager *instance;
  static AMQP::TcpChannel *channel;
  AmqpManager();

public:
  static AmqpManager *getInstance();
  void Send(std::string payload);
  void GetCallback(void (*callback)(
      const AMQP::Message &message,
      uint64_t deliveryTag,
      bool redelivered));
  void Connect();
};

AmqpManager *AmqpManager::getInstance() {
  if (instance == NULL) {
    instance = new AmqpManager();
  }
  return instance;
}

void AmqpManager::Send(std::string payload) {
  channel->publish("", TUNNELBROKER_ID, payload);
}

void AmqpManager::GetCallback(void (*callback)(
    const AMQP::Message &message,
    uint64_t deliveryTag,
    bool redelivered)) {
  channel.consume(TUNNELBROKER_ID, AMQP::noack).onReceived(callback);
}

void AmqpManager::Connect() {
  // access to the boost asio handler
  // note: we suggest use of 2 threads - normally one is fin (we are simply
  // demonstrating thread safety).
  boost::asio::io_service service(2);

  std::cout << "[AMQP] Connecting to " << AMQP_URI << std::endl;
  AMQP::LibBoostAsioHandler handler(service);

  // make a connection
  AMQP::TcpConnection connection(&handler, AMQP::Address(AMQP_URI));

  // we need a channel
  channel = new AMQP::TcpChannel(&connection);

  channel->onError([&connection](const char *message) {
    std::cout << "[AMQP] Channel error: " << message << std::endl;
    // TODO: I think we need to exit here
  });

  // Create a queue for the current tunnelbroker instance by it's ID
  channel->declareQueue(TUNNELBROKER_ID, AMQP::passive)
      .onSuccess([&connection](
                     const std::string &name,
                     uint32_t messagecount,
                     uint32_t consumercount) {
        std::cout << "[AMQP] Queue: " << name << " created." << std::endl;
      });

  // run the handler
  // a t the moment, one will need SIGINT to stop.  In time, should add
  // signal handling through boost API.
  service.run();
}

AmqpManager::AmqpManager() {
}
