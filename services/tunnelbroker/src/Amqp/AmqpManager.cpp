#include "AmqpManager.h"
#include "ConfigManager.h"
#include "Constants.h"
#include "DeliveryBroker.h"
#include "Tools.h"

#include <uv.h>

namespace comm {
namespace network {

AmqpManager &AmqpManager::getInstance() {
  static AmqpManager instance;
  return instance;
}

void AmqpManager::connectInternal() {
  const std::string amqpUri = config::ConfigManager::getInstance().getParameter(
      config::ConfigManager::OPTION_AMQP_URI);
  const std::string tunnelbrokerID =
      config::ConfigManager::getInstance().getParameter(
          config::ConfigManager::OPTION_TUNNELBROKER_ID);
  const std::string fanoutExchangeName =
      config::ConfigManager::getInstance().getParameter(
          config::ConfigManager::OPTION_AMQP_FANOUT_EXCHANGE);
  std::cout << "AMQP: Connecting to " << amqpUri << std::endl;

  auto *loop = uv_default_loop();
  AMQP::LibUvHandler handler(loop);
  AMQP::TcpConnection connection(&handler, AMQP::Address(amqpUri));

  this->amqpChannel = std::make_unique<AMQP::TcpChannel>(&connection);
  this->amqpChannel->onError([this](const char *message) {
    std::cout << "AMQP: channel error: " << message << ", will try to reconnect"
              << std::endl;
    this->amqpReady = false;
  });

  AMQP::Table arguments;
  arguments["x-message-ttl"] = std::to_string(AMQP_MESSAGE_TTL);
  arguments["x-expires"] = std::to_string(AMQP_QUEUE_TTL);
  this->amqpChannel->declareExchange(fanoutExchangeName, AMQP::fanout);
  this->amqpChannel->declareQueue(tunnelbrokerID, AMQP::durable, arguments)
      .onSuccess([this, tunnelbrokerID, fanoutExchangeName](
                     const std::string &name,
                     uint32_t messagecount,
                     uint32_t consumercount) {
        std::cout << "AMQP: Queue " << name << " created" << std::endl;
        this->amqpChannel->bindQueue(fanoutExchangeName, tunnelbrokerID, "")
            .onError([this, tunnelbrokerID, fanoutExchangeName](
                         const char *message) {
              std::cout << "AMQP: Failed to bind queue:  " << tunnelbrokerID
                        << " to exchange: " << fanoutExchangeName << std::endl;
              this->amqpReady = false;
            });
        this->amqpReady = true;
        this->amqpChannel->consume(tunnelbrokerID)
            .onReceived([](const AMQP::Message &message,
                           uint64_t deliveryTag,
                           bool redelivered) {
              try {
                AMQP::Table headers = message.headers();
                const std::string payload(message.body());
                const std::string messageID(headers[AMQP_HEADER_MESSAGEID]);
                const std::string toDeviceID(headers[AMQP_HEADER_TO_DEVICEID]);
                const std::string fromDeviceID(
                    headers[AMQP_HEADER_FROM_DEVICEID]);
                std::cout << "AMQP: Message consumed for deviceID: "
                          << toDeviceID << std::endl;
                DeliveryBroker::getInstance().push(
                    messageID, deliveryTag, toDeviceID, fromDeviceID, payload);
              } catch (const std::exception &e) {
                std::cout << "AMQP: Message parsing exception: " << e.what()
                          << std::endl;
              }
            })
            .onError([](const char *message) {
              std::cout << "AMQP: Error on message consume:  " << message
                        << std::endl;
            });
      })
      .onError([](const char *message) {
        throw std::runtime_error(
            "AMQP: Queue creation error: " + std::string(message));
      });
  uv_run(loop, UV_RUN_DEFAULT);
};

void AmqpManager::connect() {
  while (true) {
    int64_t currentTimestamp = tools::getCurrentTimestamp();
    if (this->lastConnectionTimestamp &&
        currentTimestamp - this->lastConnectionTimestamp <
            AMQP_SHORTEST_RECONNECTION_ATTEMPT_INTERVAL) {
      throw std::runtime_error(
          "AMQP reconnection attempt interval too short, tried to reconnect "
          "after " +
          std::to_string(currentTimestamp - this->lastConnectionTimestamp) +
          "ms, the shortest allowed interval is " +
          std::to_string(AMQP_SHORTEST_RECONNECTION_ATTEMPT_INTERVAL) + "ms");
    }
    this->lastConnectionTimestamp = currentTimestamp;
    this->connectInternal();
  }
}

bool AmqpManager::send(
    std::string messageID,
    std::string fromDeviceID,
    std::string toDeviceID,
    std::string payload) {
  if (!this->amqpReady) {
    std::cout << "AMQP: Message send error: channel not ready" << std::endl;
    return false;
  }
  try {
    AMQP::Envelope env(payload.c_str(), payload.size());
    AMQP::Table headers;
    headers[AMQP_HEADER_MESSAGEID] = messageID;
    headers[AMQP_HEADER_FROM_DEVICEID] = fromDeviceID;
    headers[AMQP_HEADER_TO_DEVICEID] = toDeviceID;
    // Set delivery mode to: Durable (2)
    env.setDeliveryMode(2);
    env.setHeaders(std::move(headers));
    this->amqpChannel->publish(
        config::ConfigManager::getInstance().getParameter(
            config::ConfigManager::OPTION_AMQP_FANOUT_EXCHANGE),
        "",
        env);
  } catch (std::runtime_error &e) {
    std::cout << "AMQP: Error while publishing message:  " << e.what()
              << std::endl;
    return false;
  }
  return true;
};

void AmqpManager::ack(uint64_t deliveryTag) {
  if (!this->amqpReady) {
    std::cout << "AMQP: Message ACK error: channel not ready" << std::endl;
    return;
  }
  this->amqpChannel->ack(deliveryTag);
}

} // namespace network
} // namespace comm
