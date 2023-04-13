#pragma once

#include <cstdlib>
#include <regex>
#include <string>

namespace comm {
namespace network {

// AWS DynamoDB
const size_t DYNAMODB_MAX_BATCH_ITEMS = 25;
const size_t DYNAMODB_BACKOFF_FIRST_RETRY_DELAY = 50;
const size_t DYNAMODB_MAX_BACKOFF_TIME = 10000; // 10 seconds

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

const size_t AMQP_RECONNECT_ATTEMPT_INTERVAL_MS = 3000;
const size_t AMQP_RECONNECT_MAX_ATTEMPTS = 10;

// DeviceID
// DEVICEID_CHAR_LENGTH has to be kept in sync with deviceIDCharLength
// which is defined in web/utils/device-id.js
// and with DEVICE_ID_CHAR_LENGTH
// defined in native/native_rust_library/src/crypto_tools.rs
const size_t DEVICEID_CHAR_LENGTH = 64;
// DEVICEID_FORMAT_REGEX has to be kept in sync with deviceIDFormatRegex
// which is defined in web/utils/device-id.js
// and with DEVICE_ID_FORMAT_REGEX
// defined in native/native_rust_library/src/crypto_tools.rs
const std::regex DEVICEID_FORMAT_REGEX(
    "^(ks|mobile|web):[a-zA-Z0-9]{" + std::to_string(DEVICEID_CHAR_LENGTH) +
    "}$");
const size_t DEVICE_ONLINE_PING_INTERVAL_MS = 3000;

// Config
const std::string CONFIG_FILE_DIRECTORY_ENV_VARIABLE =
    "TUNNELBROKER_CONFIG_FILE_DIRECTORY";
const std::string DEFAULT_CONFIG_FILE_DIRECTORY =
    std::string(std::getenv("HOME")) + "/.config";
const std::string CONFIG_FILE_NAME = "tunnelbroker.ini";

// DeliveryBroker
const size_t DELIVERY_BROKER_MAX_QUEUE_SIZE = 100;
// Database messages TTL
const size_t MESSAGE_RECORD_TTL = 300 * 24 * 60 * 60; // 300 days

} // namespace network
} // namespace comm
