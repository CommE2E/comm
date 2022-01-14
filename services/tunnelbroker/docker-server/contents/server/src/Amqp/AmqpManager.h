#pragma once

#include "Constants.h"
#include <boost/asio/deadline_timer.hpp>
#include <boost/asio/io_service.hpp>
#include <boost/asio/strand.hpp>

#include <amqpcpp.h>
#include <amqpcpp/libboostasio.h>
#include <string.h>

namespace comm {
namespace network {

void AMQPConnect();
bool AMQPSend(std::string payload);

} // namespace network
} // namespace comm
