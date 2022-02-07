#include "AmqpManager.h"
#include "ConfigManager.h"
#include "Constants.h"
#include "DeliveryBroker.h"
#include "Tools.h"

#include <amqpcpp/libuv.h>
#include <uv.h>

namespace comm {
namespace network {

static std::unique_ptr<AMQP::TcpChannel> amqpChannel;
static std::atomic<bool> amqpReady;
static long long lastConnectionTimestamp;

void AMQPConnectInternal() {
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

  amqpChannel = std::make_unique<AMQP::TcpChannel>(&connection);
  amqpChannel->onError([](const char *message) {
    std::cout << "AMQP: channel error: " << message << ", will try to reconnect"
              << std::endl;
    amqpReady = false;
  });

  AMQP::Table arguments;
  arguments["x-message-ttl"] = AMQP_MESSAGE_TTL;
  arguments["x-expires"] = AMQP_QUEUE_TTL;
  amqpChannel->declareExchange(fanoutExchangeName, AMQP::fanout);
  amqpChannel->declareQueue(tunnelbrokerID, AMQP::durable, arguments)
      .onSuccess([tunnelbrokerID, fanoutExchangeName](
                     const std::string &name,
                     uint32_t messagecount,
                     uint32_t consumercount) {
        std::cout << "AMQP: Queue " << name << " created" << std::endl;
        amqpChannel->bindQueue(fanoutExchangeName, tunnelbrokerID, "")
            .onError([tunnelbrokerID, fanoutExchangeName](const char *message) {
              std::cout << "AMQP: Failed to bind queue:  " << tunnelbrokerID
                        << " to exchange: " << fanoutExchangeName << std::endl;
              amqpReady = false;
            });
        amqpReady = true;
        amqpChannel->consume(tunnelbrokerID)
            .onReceived([&](const AMQP::Message &message,
                            uint64_t deliveryTag,
                            bool redelivered) {
              try {
                AMQP::Table headers = message.headers();
                const std::string payload(message.body());
                const std::string toDeviceID(headers[AMQP_HEADER_TO_DEVICEID]);
                const std::string fromDeviceID(
                    headers[AMQP_HEADER_FROM_DEVICEID]);
                std::cout << "AMQP: Message consumed for deviceID: "
                          << toDeviceID << std::endl;
                DeliveryBroker::getInstance().push(
                    deliveryTag, toDeviceID, fromDeviceID, payload);
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

void AMQPConnect() {
  while (true) {
    long long currentTimestamp = getCurrentTimestamp();
    if (lastConnectionTimestamp &&
        currentTimestamp - lastConnectionTimestamp <
            AMQP_SHORTEST_RECONNECTION_ATTEMPT_INTERVAL) {
      throw std::runtime_error(
          "AMQP reconnection attempt interval too short, tried to reconnect "
          "after " +
          std::to_string(currentTimestamp - lastConnectionTimestamp) +
          "ms, the shortest allowed interval is " +
          std::to_string(AMQP_SHORTEST_RECONNECTION_ATTEMPT_INTERVAL) + "ms");
    }
    lastConnectionTimestamp = currentTimestamp;
    AMQPConnectInternal();
  }
}

bool AMQPSend(
    std::string toDeviceID,
    std::string fromDeviceID,
    std::string payload) {
  if (!amqpReady) {
    std::cout << "AMQP: Message send error: channel not ready" << std::endl;
    return false;
  }
  try {
    AMQP::Envelope env(payload.c_str(), payload.size());
    AMQP::Table headers;
    headers[AMQP_HEADER_FROM_DEVICEID] = fromDeviceID;
    headers[AMQP_HEADER_TO_DEVICEID] = toDeviceID;
    // Set delivery mode to: Durable (2)
    env.setDeliveryMode(2);
    env.setHeaders(std::move(headers));
    amqpChannel->publish(
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

void AMQPAck(uint64_t deliveryTag) {
  if (!amqpReady) {
    std::cout << "AMQP: Message ACK error: channel not ready" << std::endl;
    return;
  }
  amqpChannel->ack(deliveryTag);
}

} // namespace network
} // namespace comm
