#pragma once

#include <regex>
#include <string>

namespace comm {
namespace network {

// Tunnelbroker server Identification
const std::string TUNNELBROKER_ID = "tunnel1";

// AWS
const std::string DEVICE_SESSIONS_TABLE_NAME = "tunnelbroker-device-session";
const std::string DEVICE_SESSIONS_VERIFICATION_MESSAGES_TABLE_NAME =
    "tunnelbroker-verification-message";
const std::string DEVICE_PUBLIC_KEY_TABLE_NAME = "tunnelbroker-public-key";

// Sessions
const size_t SIGNATURE_REQUEST_LENGTH = 64;
const size_t SESSION_ID_LENGTH = 64;
const size_t SESSION_RECORD_TTL = 30 * 24 * 3600; // 30 days
const size_t SESSION_SIGN_RECORD_TTL = 24 * 3600; // 24 hours

// gRPC Server
const std::string SERVER_LISTEN_ADDRESS = "0.0.0.0:50051";

// AMQP (RabbitMQ)
const std::string AMQP_URI = "amqp://guest:guest@0.0.0.0/vhost";
const std::string AMQP_FANOUT_EXCHANGE_NAME = "allBrokers";
// message TTL
const size_t AMQP_MESSAGE_TTL = 300 * 1000; // 5 min
// queue TTL in case of no consumers (tunnelbroker is down)
const size_t AMQP_QUEUE_TTL = 24 * 3600 * 1000; // 24 hours
// routing message headers name
const std::string AMQP_HEADER_FROM_DEVICEID = "fromDeviceid";
const std::string AMQP_HEADER_TO_DEVICEID = "toDeviceid";

const long long AMQP_SHORTEST_RECONNECTION_ATTEMPT_INTERVAL =
    1000 * 60; // 1 min

// DeviceID
const std::string DEVICEID_DEFAULT_KEYSERVER_ID = "ks:256";
const size_t DEVICEID_CHAR_LENGTH = 64;
const std::regex DEVICEID_FORMAT_REGEX(
    "^(ks|mobile|web):[a-zA-Z0-9]{" + std::to_string(DEVICEID_CHAR_LENGTH) +
    "}$");

} // namespace network
} // namespace comm
