#include "AmqpManager.h"
#include "ConfigManager.h"
#include "Constants.h"
#include "DeliveryBroker.h"
#include "GlobalTools.h"

#include <glog/logging.h>

#include <uv.h>
#include <chrono>
#include <thread>

namespace comm {
namespace network {

AmqpManager &AmqpManager::getInstance() {
  static AmqpManager instance;
  return instance;
}

void AmqpManager::init() {
  std::call_once(initOnceFlag, [&]() {
    std::thread amqpClientThread([&]() { this->connect(); });
    amqpClientThread.detach();
  });
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
  LOG(INFO) << "AMQP: Connecting to " << amqpUri;
  uv_loop_t *localUvLoop = uv_default_loop();
  AMQP::LibUvHandler uvHandler(localUvLoop);
  AMQP::TcpConnection tcpConnection(&uvHandler, AMQP::Address(amqpUri));
  this->amqpChannel = std::make_unique<AMQP::TcpChannel>(&tcpConnection);
  this->amqpChannel->onReady([this]() {
    LOG(INFO) << "AMQP: Channel is ready";
    this->amqpReady = true;
    this->reconnectAttempt = 0;
  });
  this->amqpChannel->onError([this](const char *message) {
    LOG(ERROR) << "AMQP: Channel error: " << message;
    this->amqpReady = false;
  });

  AMQP::Table arguments;
  arguments["x-message-ttl"] = (uint64_t)AMQP_MESSAGE_TTL;
  arguments["x-expires"] = (uint64_t)AMQP_QUEUE_TTL;
  this->amqpChannel->declareExchange(fanoutExchangeName, AMQP::fanout);
  this->amqpChannel->declareQueue(tunnelbrokerID, AMQP::durable, arguments)
      .onSuccess([this, tunnelbrokerID, fanoutExchangeName](
                     const std::string &name,
                     uint32_t messagecount,
                     uint32_t consumercount) {
        LOG(INFO) << "AMQP: Queue " << name << " created";
        this->amqpChannel->bindQueue(fanoutExchangeName, tunnelbrokerID, "")
            .onError([this, tunnelbrokerID, fanoutExchangeName](
                         const char *message) {
              LOG(ERROR) << "AMQP: Failed to bind queue:  " << tunnelbrokerID
                         << " to exchange: " << fanoutExchangeName;
            });
        this->amqpChannel->consume(tunnelbrokerID)
            .onReceived([](const AMQP::Message &message,
                           uint64_t deliveryTag,
                           bool redelivered) {
              try {
                AMQP::Table headers = message.headers();
                const std::string payload(message.body(), message.bodySize());
                const std::string messageID(headers[AMQP_HEADER_MESSAGEID]);
                const std::string toDeviceID(headers[AMQP_HEADER_TO_DEVICEID]);
                const std::string fromDeviceID(
                    headers[AMQP_HEADER_FROM_DEVICEID]);
                DeliveryBroker::getInstance().push(
                    messageID, deliveryTag, toDeviceID, fromDeviceID, payload);
              } catch (const std::exception &e) {
                LOG(ERROR) << "AMQP: Message parsing exception: " << e.what();
              }
            })
            .onError([](const char *message) {
              LOG(ERROR) << "AMQP: Error on message consume:  " << message;
            });
      })
      .onError([](const char *message) {
        LOG(ERROR) << "AMQP: Queue creation error: " + std::string(message);
      });
  uv_run(localUvLoop, UV_RUN_DEFAULT);
};

void AmqpManager::connect() {
  this->connectInternal();
  while (this->reconnectAttempt < AMQP_RECONNECT_MAX_ATTEMPTS) {
    this->reconnectAttempt++;
    LOG(INFO) << "AMQP: Attempt " << this->reconnectAttempt
              << " to reconnect in " << AMQP_RECONNECT_ATTEMPT_INTERVAL_MS
              << " ms";
    std::this_thread::sleep_for(
        std::chrono::milliseconds(AMQP_RECONNECT_ATTEMPT_INTERVAL_MS));
    this->connectInternal();
  }
  LOG(FATAL) << "Cannot connect to AMQP server after "
             << AMQP_RECONNECT_MAX_ATTEMPTS << " attempts";
}

bool AmqpManager::send(const database::MessageItem *message) {
  waitUntilReady();
  try {
    const std::string messagePayload = message->getPayload();
    AMQP::Envelope env(messagePayload.c_str(), messagePayload.size());
    AMQP::Table headers;
    headers[AMQP_HEADER_MESSAGEID] = message->getMessageID();
    headers[AMQP_HEADER_FROM_DEVICEID] = message->getFromDeviceID();
    headers[AMQP_HEADER_TO_DEVICEID] = message->getToDeviceID();
    // Set delivery mode to: Durable (2)
    env.setDeliveryMode(2);
    env.setHeaders(std::move(headers));

    std::scoped_lock lock{this->channelMutex};
    this->amqpChannel->publish(
        config::ConfigManager::getInstance().getParameter(
            config::ConfigManager::OPTION_AMQP_FANOUT_EXCHANGE),
        "",
        env);
  } catch (std::runtime_error &e) {
    LOG(ERROR) << "AMQP: Error while publishing message:  " << e.what();
    return false;
  }
  return true;
};

void AmqpManager::ack(uint64_t deliveryTag) {
  waitUntilReady();
  std::scoped_lock lock{this->channelMutex};
  this->amqpChannel->ack(deliveryTag);
}

void AmqpManager::waitUntilReady() {
  while (!this->amqpReady) {
    LOG(INFO) << "AMQP: Connection is not ready, waiting";
    std::this_thread::sleep_for(
        std::chrono::milliseconds(AMQP_RECONNECT_ATTEMPT_INTERVAL_MS));
  }
}

} // namespace network
} // namespace comm
