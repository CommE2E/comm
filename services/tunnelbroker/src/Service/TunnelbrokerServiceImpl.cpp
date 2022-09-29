#include "TunnelbrokerServiceImpl.h"
#include "AmqpManager.h"
#include "AwsTools.h"
#include "ConfigManager.h"
#include "CryptoTools.h"
#include "DatabaseManager.h"
#include "DeliveryBroker.h"
#include "GlobalTools.h"
#include "Tools.h"

#include "rust-lib/src/lib.rs.h"
#include "rust/cxx.h"

#include <glog/logging.h>

#include <atomic>
#include <chrono>
#include <mutex>
#include <thread>

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
      return grpc::Status(
          grpc::StatusCode::PERMISSION_DENIED,
          "The public key doesn't match for deviceID");
    }
    const std::string verificationMessage = sessionSignItem->getSign();
    if (!comm::network::crypto::rsaVerifyString(
            publicKey, verificationMessage, signature)) {
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
      return grpc::Status(
          grpc::StatusCode::INVALID_ARGUMENT,
          "Format validation failed for sessionID");
    }
    std::shared_ptr<database::DeviceSessionItem> sessionItem =
        database::DatabaseManager::getInstance().findSessionItem(sessionID);
    if (sessionItem == nullptr) {
      return grpc::Status(
          grpc::StatusCode::PERMISSION_DENIED,
          "No such session found. SessionID: " + sessionID);
    }
    const std::string clientDeviceID = sessionItem->getDeviceID();
    const std::string messageID = tools::generateUUID();
    const std::string notifyToken = sessionItem->getNotifyToken();
    const std::string deviceOs = sessionItem->getDeviceOs();

    const database::MessageItem message(
        messageID,
        clientDeviceID,
        request->todeviceid(),
        request->payload(),
        "");
    database::DatabaseManager::getInstance().putMessageItem(message);
    if (!AmqpManager::getInstance().send(&message)) {
      LOG(ERROR) << "gRPC: "
                 << "Error while publish the message to AMQP";
      return grpc::Status(
          grpc::StatusCode::INTERNAL,
          "Error while publish the message to AMQP");
    }

    if (!sessionItem->getIsOnline()) {
      const std::string notificationMessageTitle = "New message";
      const std::string notificationMessageText = "You have a new message";
      if (deviceOs == "iOS" && !notifyToken.empty()) {
        const apnsReturnStatus apnsResult = sendNotifToAPNS(
            config::ConfigManager::getInstance().getParameter(
                config::ConfigManager::OPTION_NOTIFS_APNS_P12_CERT_PATH),
            config::ConfigManager::getInstance().getParameter(
                config::ConfigManager::OPTION_NOTIFS_APNS_P12_CERT_PASSWORD),
            notifyToken,
            config::ConfigManager::getInstance().getParameter(
                config::ConfigManager::OPTION_NOTIFS_APNS_TOPIC),
            notificationMessageText,
            false);
        if ((apnsResult == apnsReturnStatus::Unregistered ||
             apnsResult == apnsReturnStatus::BadDeviceToken) &&
            !database::DatabaseManager::getInstance()
                 .updateSessionItemDeviceToken(sessionID, "")) {
          return grpc::Status(
              grpc::StatusCode::INTERNAL,
              "Can't clear the device token in database");
        }
      } else if (deviceOs == "Android" && !notifyToken.empty()) {
        const fcmReturnStatus fcmResult = sendNotifToFCM(
            config::ConfigManager::getInstance().getParameter(
                config::ConfigManager::OPTION_NOTIFS_FCM_SERVER_KEY),
            notifyToken,
            notificationMessageTitle,
            notificationMessageText);
        if ((fcmResult == fcmReturnStatus::InvalidRegistration ||
             fcmResult == fcmReturnStatus::NotRegistered) &&
            !database::DatabaseManager::getInstance()
                 .updateSessionItemDeviceToken(sessionID, "")) {
          return grpc::Status(
              grpc::StatusCode::INTERNAL,
              "Can't clear the device token in database");
        }
      }
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

  std::mutex writerMutex;
  std::atomic_bool writerIsReady{true};

  const std::string sessionID = request->sessionid();
  if (!tools::validateSessionID(sessionID)) {
    return grpc::Status(
        grpc::StatusCode::INVALID_ARGUMENT,
        "Format validation failed for sessionID");
  }
  // Thread-safe response writer
  auto respondToWriter = [&](tunnelbroker::GetResponse response) {
    std::lock_guard<std::mutex> lock(writerMutex);
    if (!writerIsReady) {
      return false;
    }
    if (!writer->Write(response)) {
      writerIsReady = false;
      database::DatabaseManager::getInstance().updateSessionItemIsOnline(
          sessionID, false);
      return false;
    }
    return true;
  };

  // Keep-alive detection pinging thread
  tunnelbroker::GetResponse pingResponse;
  pingResponse.mutable_ping();
  auto sendingPings = [&]() {
    while (respondToWriter(pingResponse)) {
      std::this_thread::sleep_for(
          std::chrono::milliseconds(DEVICE_ONLINE_PING_INTERVAL_MS));
    }
    LOG(INFO) << "gRPC 'Get' handler write error on sending ping to the client";
  };

  try {
    std::shared_ptr<database::DeviceSessionItem> sessionItem =
        database::DatabaseManager::getInstance().findSessionItem(sessionID);
    if (sessionItem == nullptr) {
      return grpc::Status(
          grpc::StatusCode::PERMISSION_DENIED,
          "No such session found. SessionID: " + sessionID);
    }

    tunnelbroker::GetResponse response;
    // Handling of device notification token expiration and update
    if (request->has_newnotifytoken()) {
      if (!database::DatabaseManager::getInstance()
               .updateSessionItemDeviceToken(
                   sessionID, request->newnotifytoken())) {
        return grpc::Status(
            grpc::StatusCode::INTERNAL,
            "Can't update device token in the database");
      }
      sessionItem =
          database::DatabaseManager::getInstance().findSessionItem(sessionID);
    } else if (sessionItem->getNotifyToken().empty()) {
      response.mutable_newnotifytokenrequired();
      if (!writer->Write(response)) {
        throw std::runtime_error(
            "gRPC writer error on sending data to the client");
      }
      response.Clear();
    }

    const std::string clientDeviceID = sessionItem->getDeviceID();
    DeliveryBrokerMessage messageToDeliver;

    std::vector<std::shared_ptr<database::MessageItem>> messagesFromDatabase =
        database::DatabaseManager::getInstance().findMessageItemsByReceiver(
            clientDeviceID);
    if (messagesFromDatabase.size() > 0) {
      // When a client connects and requests GET for the messages first we check
      // if there are undelivered messages in the database. If so, we are
      // erasing the messages to deliver from rabbitMQ which are handled by
      // DeliveryBroker.
      DeliveryBroker::getInstance().erase(clientDeviceID);
    }
    database::DatabaseManager::getInstance().updateSessionItemIsOnline(
        sessionID, true);

    for (auto &messageFromDatabase : messagesFromDatabase) {
      tunnelbroker::GetResponse response;
      response.mutable_responsemessage()->set_fromdeviceid(
          messageFromDatabase->getFromDeviceID());
      response.mutable_responsemessage()->set_payload(
          messageFromDatabase->getPayload());
      if (!respondToWriter(response)) {
        return grpc::Status(
            grpc::StatusCode::INTERNAL, "Channel writer is unavailable");
      }
      database::DatabaseManager::getInstance().removeMessageItem(
          clientDeviceID, messageFromDatabase->getMessageID());
    }
    // We are starting the pinging thread and sending pings only after
    // messages from the database was delivered and we are waiting for the new
    // messages to come to check is connection alive.
    std::thread pingThread(sendingPings);

    while (1) {
      messageToDeliver = DeliveryBroker::getInstance().pop(clientDeviceID);
      tunnelbroker::GetResponse response;
      response.mutable_responsemessage()->set_fromdeviceid(
          messageToDeliver.fromDeviceID);
      response.mutable_responsemessage()->set_payload(messageToDeliver.payload);
      if (!respondToWriter(response)) {
        pingThread.join();
        return grpc::Status(
            grpc::StatusCode::INTERNAL, "Channel writer is unavailable");
      }
      comm::network::AmqpManager::getInstance().ack(
          messageToDeliver.deliveryTag);
      database::DatabaseManager::getInstance().removeMessageItem(
          clientDeviceID, messageToDeliver.messageID);
      // If messages queue for `clientDeviceID` is empty we don't need to store
      // `folly::MPMCQueue` for it and need to free memory to fix possible
      // 'ghost' queues in DeliveryBroker.
      // We call `deleteQueueIfEmpty()` for this purpose here.
      DeliveryBroker::getInstance().deleteQueueIfEmpty(clientDeviceID);
    }
  } catch (std::runtime_error &e) {
    LOG(ERROR) << "gRPC: Runtime error while processing 'Get' request: "
               << e.what();
    database::DatabaseManager::getInstance().updateSessionItemIsOnline(
        sessionID, false);
    return grpc::Status(grpc::StatusCode::INTERNAL, e.what());
  } catch (...) {
    LOG(ERROR) << "gRPC: Unknown error while processing 'Get' request";
    database::DatabaseManager::getInstance().updateSessionItemIsOnline(
        sessionID, false);
    return grpc::Status(grpc::StatusCode::INTERNAL, "Unknown error");
  }
  return grpc::Status::OK;
};

} // namespace network
} // namespace comm
