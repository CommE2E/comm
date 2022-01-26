#pragma once

#include <amqpcpp.h>

#include <atomic>
#include <memory>
#include <string>

namespace comm {
namespace network {

void AMQPConnect();
void AMQPConnectInternal();
bool AMQPSend(
    std::string toDeviceID,
    std::string fromDeviceID,
    std::string payload);
void AMQPAck(uint64_t deliveryTag);

} // namespace network
} // namespace comm
