#include "TunnelbrokerServiceImpl.h"

#include "AmqpManager.h"
#include "AwsTools.h"
#include "ConfigManager.h"
#include "CryptoTools.h"
#include "DatabaseManager.h"
#include "DeliveryBroker.h"
#include "Tools.h"
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
          config::ConfigManager::OPTION_DYNAMODB_SESSIONS_PUBLIC_KEY_TABLE)};
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
  if (!validateDeviceID(deviceID)) {
    std::cout << "gRPC: "
              << "Format validation failed for " << deviceID << std::endl;
    return grpc::Status(
        grpc::StatusCode::INVALID_ARGUMENT,
        "Format validation failed for deviceID");
  }
  const std::string toSign = generateRandomString(SIGNATURE_REQUEST_LENGTH);
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
  if (!validateDeviceID(deviceID)) {
    std::cout << "gRPC: "
              << "Format validation failed for " << deviceID << std::endl;
    return grpc::Status(
        grpc::StatusCode::INVALID_ARGUMENT,
        "Format validation failed for deviceID");
  }
  const std::string signature = request->signature();
  const std::string publicKey = request->publickey();
  const std::string newSessionID = generateUUID();
  try {
    sessionSignItem =
        database::DatabaseManager::getInstance().findSessionSignItem(deviceID);
    if (sessionSignItem == nullptr) {
      std::cout << "gRPC: "
                << "Session sign request not found for deviceID: " << deviceID
                << std::endl;
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
      std::cout << "gRPC: "
                << "The public key doesn't match for deviceID" << std::endl;
      return grpc::Status(
          grpc::StatusCode::PERMISSION_DENIED,
          "The public key doesn't match for deviceID");
    }
    const std::string verificationMessage = sessionSignItem->getSign();
    if (!comm::network::crypto::rsaVerifyString(
            publicKey, verificationMessage, signature)) {
      std::cout << "gRPC: "
                << "Signature for the verification message is not valid"
                << std::endl;
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
    std::cout << "gRPC: "
              << "Error while processing 'NewSession' request: " << e.what()
              << std::endl;
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
    if (!validateSessionID(sessionID)) {
      std::cout << "gRPC: "
                << "Format validation failed for " << sessionID << std::endl;
      return grpc::Status(
          grpc::StatusCode::INVALID_ARGUMENT,
          "Format validation failed for sessionID");
    }
    std::shared_ptr<database::DeviceSessionItem> sessionItem =
        database::DatabaseManager::getInstance().findSessionItem(sessionID);
    if (sessionItem == nullptr) {
      std::cout << "gRPC: "
                << "Session " << sessionID << " not found" << std::endl;
      return grpc::Status(
          grpc::StatusCode::PERMISSION_DENIED,
          "No such session found. SessionID: " + sessionID);
    }
    const std::string clientDeviceID = sessionItem->getDeviceID();
    if (!AMQPSend(
            request->todeviceid(),
            clientDeviceID,
            std::string(request->payload()))) {
      std::cout << "gRPC: "
                << "Error while publish the message to AMQP" << std::endl;
      return grpc::Status(
          grpc::StatusCode::INTERNAL,
          "Error while publish the message to AMQP");
    }
  } catch (std::runtime_error &e) {
    std::cout << "gRPC: "
              << "Error while processing 'Send' request: " << e.what()
              << std::endl;
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
    if (!validateSessionID(sessionID)) {
      std::cout << "gRPC: "
                << "Format validation failed for " << sessionID << std::endl;
      return grpc::Status(
          grpc::StatusCode::INVALID_ARGUMENT,
          "Format validation failed for sessionID");
    }
    std::shared_ptr<database::DeviceSessionItem> sessionItem =
        database::DatabaseManager::getInstance().findSessionItem(sessionID);
    if (sessionItem == nullptr) {
      std::cout << "gRPC: "
                << "Session " << sessionID << " not found" << std::endl;
      return grpc::Status(
          grpc::StatusCode::PERMISSION_DENIED,
          "No such session found. SessionID: " + sessionID);
    }
    const std::string clientDeviceID = sessionItem->getDeviceID();
    std::vector<DeliveryBrokerMessage> messagesToDeliver;
    while (1) {
      messagesToDeliver = DeliveryBroker::getInstance().get(clientDeviceID);
      for (auto const &message : messagesToDeliver) {
        tunnelbroker::GetResponse response;
        response.set_fromdeviceid(message.fromDeviceID);
        response.set_payload(message.payload);
        if (!writer->Write(response)) {
          throw std::runtime_error(
              "gRPC: 'Get' writer error on sending data to the client");
        }
        AMQPAck(message.deliveryTag);
      }
      if (!DeliveryBroker::getInstance().isEmpty(clientDeviceID)) {
        DeliveryBroker::getInstance().remove(clientDeviceID);
      }
      DeliveryBroker::getInstance().wait(clientDeviceID);
    }
  } catch (std::runtime_error &e) {
    std::cout << "gRPC: "
              << "Error while processing 'Get' request: " << e.what()
              << std::endl;
    return grpc::Status(grpc::StatusCode::INTERNAL, e.what());
  }
  return grpc::Status::OK;
};

grpc::ServerBidiReactor<
    tunnelbroker::OutboundMessage,
    tunnelbroker::InboundMessage> *
TunnelBrokerServiceImpl::OpenStream(grpc::CallbackServerContext *context) {
  class Reactor : public grpc::ServerBidiReactor<
                      tunnelbroker::OutboundMessage,
                      tunnelbroker::InboundMessage> {
  public:
    Reactor(grpc::CallbackServerContext *ctx) : ctx_(ctx) {
      const std::string uuid = generateUUID();
      connectionId_ = boost::lexical_cast<std::string>(uuid);
      if (ctx->client_metadata().find("sessionId") !=
          ctx->client_metadata().end()) {
        grpc::string_ref sessionId =
            ctx->client_metadata().find("sessionId")->second;
        std::shared_ptr<database::DeviceSessionItem> sessionItem =
            database::DatabaseManager::getInstance().findSessionItem(
                sessionId.data());
        if (sessionItem == nullptr) {
          std::cout << "gRPC: "
                    << "Session " << sessionId << " not found" << std::endl;
          ctx->TryCancel();
        }
        clientDeviceId_ = sessionItem->getDeviceID();
      } else {
        ctx->TryCancel();
      }
      StartRead(&outbound_);
    }

    void OnDone() override {
      GPR_ASSERT(finished_);
      delete this;
    }

    void OnCancel() override {
    }

    void OnReadDone(bool ok) override {
      if (!ok) {
        Finish(grpc::Status::OK);
        finished_ = true;
        return;
      }
      inbound_.set_fromdeviceid(clientDeviceId_);
      inbound_.set_fromconnectionid(connectionId_);
      inbound_.set_payload(outbound_.payload());

      StartWrite(&inbound_);
    }

    void OnWriteDone(bool ok) override {
      if (!ok) {
        gpr_log(GPR_ERROR, "Server write failed");
        return;
      }
      StartRead(&outbound_);
    }

  private:
    grpc::CallbackServerContext *const ctx_;
    tunnelbroker::OutboundMessage outbound_;
    tunnelbroker::InboundMessage inbound_;
    std::string clientDeviceId_;
    std::string connectionId_;
    bool finished_{false};
  };

  return new Reactor(context);
};
} // namespace network
} // namespace comm
