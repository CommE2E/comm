#pragma once

#include <string>

// Tunnelbroker server Identification
const std::string TUNNELBROKER_ID = "tunnel1";

// AWS
const std::string AWS_REGION = "us-east-2";
const std::string DEVICE_SESSIONS_TABLE_NAME = "tunnelbroker-service-devices";

// Sessions
const size_t SIGNATURE_REQUEST_LENGTH = 32;
const size_t SESSION_ID_LENGTH = 16;

// gRPC Server
const std::string SERVER_LISTEN_ADDRESS = "0.0.0.0:50051";

// gRPC Settings
// 4MB limit
const size_t GRPC_CHUNK_SIZE_LIMIT = 4 * 1024 * 1024;
const size_t GRPC_METADATA_SIZE_PER_MESSAGE = 5;

// AMQP (RabbitMQ)
const std::string AMQP_URI = "amqp://guest:guest@localhost/";
