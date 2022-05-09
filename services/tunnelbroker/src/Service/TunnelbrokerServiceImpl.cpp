#include "TunnelbrokerServiceImpl.h"
#include "AmqpManager.h"
#include "AwsTools.h"
#include "ConfigManager.h"
#include "CryptoTools.h"
#include "DatabaseManager.h"
#include "DeliveryBroker.h"
#include "Tools.h"

#include <glog/logging.h>

namespace comm {
namespace network {

TunnelBrokerServiceImpl::TunnelBrokerServiceImpl() {
  Aws::InitAPI({});
  // List of AWS DynamoDB tables to check if they are created and can be
  // accessed before any AWS API methods
  const std::list<std::string> tablesList = {
      config::ConfigManager::getInstance().getParameter(
          config::ConfigManager::OPTION_DYNAMODB_SESSIONS_TABLE),
      config::ConfigManager::getInstance().getParameter(
          config::ConfigManager::OPTION_DYNAMODB_SESSIONS_VERIFICATION_TABLE),
      config::ConfigManager::getInstance().getParameter(
          config::ConfigManager::OPTION_DYNAMODB_SESSIONS_PUBLIC_KEY_TABLE),
      config::ConfigManager::getInstance().getParameter(
          config::ConfigManager::OPTION_DYNAMODB_MESSAGES_TABLE)};
  for (const std::string &table : tablesList) {
    if (!database::DatabaseManager::getInstance().isTableAvailable(table)) {
      throw std::runtime_error(
          "Error: AWS DynamoDB table '" + table + "' is not available");
    }
  };
};

TunnelBrokerServiceImpl::~TunnelBrokerServiceImpl() {
  Aws::ShutdownAPI({});
};

grpc::Status TunnelBrokerServiceImpl::SessionSignature(
    grpc::ServerContext *context,
    const tunnelbroker::SessionSignatureRequest *request,
    tunnelbroker::SessionSignatureResponse *reply) {
  const std::string deviceID = request->deviceid();
  if (!tools::validateDeviceID(deviceID)) {
    LOG(INFO) << "gRPC: "
              << "Format validation failed for " << deviceID;
    return grpc::Status(
        grpc::StatusCode::INVALID_ARGUMENT,
        "Format validation failed for deviceID");
  }
  const std::string toSign =
      tools::generateRandomString(SIGNATURE_REQUEST_LENGTH);
  std::shared_ptr<database::SessionSignItem> SessionSignItem =
      std::make_shared<database::SessionSignItem>(toSign, deviceID);
  database::DatabaseManager::getInstance().putSessionSignItem(*SessionSignItem);
  reply->set_tosign(toSign);
  return grpc::Status::OK;
};

grpc::Status TunnelBrokerServiceImpl::NewSession(
    grpc::ServerContext *context,
    const tunnelbroker::NewSessionRequest *request,
    tunnelbroker::NewSessionResponse *reply) {

  std::shared_ptr<database::DeviceSessionItem> deviceSessionItem;
  std::shared_ptr<database::SessionSignItem> sessionSignItem;
  std::shared_ptr<database::PublicKeyItem> publicKeyItem;
  const std::string deviceID = request->deviceid();
  if (!tools::validateDeviceID(deviceID)) {
    LOG(INFO) << "gRPC: "
              << "Format validation failed for " << deviceID;
    return grpc::Status(
        grpc::StatusCode::INVALID_ARGUMENT,
        "Format validation failed for deviceID");
  }
  const std::string signature = request->signature();
  const std::string publicKey = request->publickey();
  const std::string newSessionID = tools::generateUUID();
  try {
    sessionSignItem =
        database::DatabaseManager::getInstance().findSessionSignItem(deviceID);
    if (sessionSignItem == nullptr) {
      LOG(INFO) << "gRPC: "
                << "Session sign request not found for deviceID: " << deviceID;
      return grpc::Status(
          grpc::StatusCode::NOT_FOUND, "Session sign request not found");
    }
    publicKeyItem =
        database::DatabaseManager::getInstance().findPublicKeyItem(deviceID);
    if (publicKeyItem == nullptr) {
      std::shared_ptr<database::PublicKeyItem> newPublicKeyItem =
          std::make_shared<database::PublicKeyItem>(deviceID, publicKey);
      database::DatabaseManager::getInstance().putPublicKeyItem(
          *newPublicKeyItem);
    } else if (publicKey != publicKeyItem->getPublicKey()) {
      LOG(INFO) << "gRPC: "
                << "The public key doesn't match for deviceID";
      return grpc::Status(
          grpc::StatusCode::PERMISSION_DENIED,
          "The public key doesn't match for deviceID");
    }
    const std::string verificationMessage = sessionSignItem->getSign();
    if (!comm::network::crypto::rsaVerifyString(
            publicKey, verificationMessage, signature)) {
      LOG(INFO) << "gRPC: "
                << "Signature for the verification message is not valid";
      return grpc::Status(
          grpc::StatusCode::PERMISSION_DENIED,
          "Signature for the verification message is not valid");
    }
    database::DatabaseManager::getInstance().removeSessionSignItem(deviceID);

    deviceSessionItem = std::make_shared<database::DeviceSessionItem>(
        newSessionID,
        deviceID,
        request->publickey(),
        request->notifytoken(),
        tunnelbroker::NewSessionRequest_DeviceTypes_Name(request->devicetype()),
        request->deviceappversion(),
        request->deviceos());
    database::DatabaseManager::getInstance().putSessionItem(*deviceSessionItem);
  } catch (std::runtime_error &e) {
    LOG(ERROR) << "gRPC: "
               << "Error while processing 'NewSession' request: " << e.what();
    return grpc::Status(grpc::StatusCode::INTERNAL, e.what());
  }
  reply->set_sessionid(newSessionID);
  return grpc::Status::OK;
};

grpc::Status TunnelBrokerServiceImpl::Send(
    grpc::ServerContext *context,
    const tunnelbroker::SendRequest *request,
    google::protobuf::Empty *reply) {
  try {
    const std::string sessionID = request->sessionid();
    if (!tools::validateSessionID(sessionID)) {
      LOG(INFO) << "gRPC: "
                << "Format validation failed for " << sessionID;
      return grpc::Status(
          grpc::StatusCode::INVALID_ARGUMENT,
          "Format validation failed for sessionID");
    }
    std::shared_ptr<database::DeviceSessionItem> sessionItem =
        database::DatabaseManager::getInstance().findSessionItem(sessionID);
    if (sessionItem == nullptr) {
      LOG(INFO) << "gRPC: "
                << "Session " << sessionID << " not found";
      return grpc::Status(
          grpc::StatusCode::PERMISSION_DENIED,
          "No such session found. SessionID: " + sessionID);
    }
    const std::string clientDeviceID = sessionItem->getDeviceID();
    const std::string messageID = tools::generateUUID();
    if (!AmqpManager::getInstance().send(
            messageID,
            clientDeviceID,
            request->todeviceid(),
            std::string(request->payload()))) {
      LOG(ERROR) << "gRPC: "
                 << "Error while publish the message to AMQP";
      return grpc::Status(
          grpc::StatusCode::INTERNAL,
          "Error while publish the message to AMQP");
    }
  } catch (std::runtime_error &e) {
    LOG(ERROR) << "gRPC: "
               << "Error while processing 'Send' request: " << e.what();
    return grpc::Status(grpc::StatusCode::INTERNAL, e.what());
  }
  return grpc::Status::OK;
};

grpc::Status TunnelBrokerServiceImpl::Get(
    grpc::ServerContext *context,
    const tunnelbroker::GetRequest *request,
    grpc::ServerWriter<tunnelbroker::GetResponse> *writer) {
  try {
    const std::string sessionID = request->sessionid();
    if (!tools::validateSessionID(sessionID)) {
      LOG(INFO) << "gRPC: "
                << "Format validation failed for " << sessionID;
      return grpc::Status(
          grpc::StatusCode::INVALID_ARGUMENT,
          "Format validation failed for sessionID");
    }
    std::shared_ptr<database::DeviceSessionItem> sessionItem =
        database::DatabaseManager::getInstance().findSessionItem(sessionID);
    if (sessionItem == nullptr) {
      LOG(INFO) << "gRPC: "
                << "Session " << sessionID << " not found";
      return grpc::Status(
          grpc::StatusCode::PERMISSION_DENIED,
          "No such session found. SessionID: " + sessionID);
    }
    const std::string clientDeviceID = sessionItem->getDeviceID();
    DeliveryBrokerMessage messageToDeliver;
    while (1) {
      messageToDeliver = DeliveryBroker::getInstance().pop(clientDeviceID);
      tunnelbroker::GetResponse response;
      response.set_fromdeviceid(messageToDeliver.fromDeviceID);
      response.set_payload(messageToDeliver.payload);
      if (!writer->Write(response)) {
        throw std::runtime_error(
            "gRPC: 'Get' writer error on sending data to the client");
      }
      comm::network::AmqpManager::getInstance().ack(
          messageToDeliver.deliveryTag);
      if (DeliveryBroker::getInstance().isEmpty(clientDeviceID)) {
        DeliveryBroker::getInstance().erase(clientDeviceID);
      }
    }
  } catch (std::runtime_error &e) {
    LOG(ERROR) << "gRPC: "
               << "Error while processing 'Get' request: " << e.what();
    return grpc::Status(grpc::StatusCode::INTERNAL, e.what());
  }
  return grpc::Status::OK;
};

} // namespace network
} // namespace comm
