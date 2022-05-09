#pragma once

#include <cstdlib>
#include <regex>
#include <string>

namespace comm {
namespace network {

// AWS DynamoDB
const std::string DEVICE_SESSIONS_TABLE_NAME = "tunnelbroker-device-sessions";
const std::string DEVICE_SESSIONS_VERIFICATION_MESSAGES_TABLE_NAME =
    "tunnelbroker-verification-messages";
const std::string DEVICE_PUBLIC_KEY_TABLE_NAME = "tunnelbroker-public-keys";
const std::string MESSAGES_TABLE_NAME = "tunnelbroker-messages";

// Sessions
const size_t SIGNATURE_REQUEST_LENGTH = 64;
const size_t SESSION_ID_LENGTH = 64;
const size_t SESSION_RECORD_TTL = 30 * 24 * 3600; // 30 days
const size_t SESSION_SIGN_RECORD_TTL = 24 * 3600; // 24 hours
const std::regex SESSION_ID_FORMAT_REGEX(
    "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}");

// gRPC Server
const std::string SERVER_LISTEN_ADDRESS = "0.0.0.0:50051";

// AMQP (RabbitMQ)
const std::string AMQP_FANOUT_EXCHANGE_NAME = "allBrokers";
// Message broker queue message TTL
const size_t AMQP_MESSAGE_TTL = 300 * 1000; // 5 min
// queue TTL in case of no consumers (tunnelbroker is down)
const size_t AMQP_QUEUE_TTL = 24 * 3600 * 1000; // 24 hours
// routing message headers name
const std::string AMQP_HEADER_FROM_DEVICEID = "fromDeviceID";
const std::string AMQP_HEADER_TO_DEVICEID = "toDeviceID";
const std::string AMQP_HEADER_MESSAGEID = "messageID";

const int64_t AMQP_SHORTEST_RECONNECTION_ATTEMPT_INTERVAL = 1000 * 60; // 1 min

// DeviceID
const size_t DEVICEID_CHAR_LENGTH = 64;
const std::regex DEVICEID_FORMAT_REGEX(
    "^(ks|mobile|web):[a-zA-Z0-9]{" + std::to_string(DEVICEID_CHAR_LENGTH) +
    "}$");

// Config
const std::string CONFIG_FILE_PATH =
    std::string(std::getenv("HOME")) + "/tunnelbroker/tunnelbroker.ini";

// DeliveryBroker
const size_t DELIVERY_BROKER_MAX_QUEUE_SIZE = 100;
// Database messages TTL
const size_t MESSAGE_RECORD_TTL = 300 * 24 * 60 * 60; // 300 days

} // namespace network
} // namespace comm
