#include "Tunnelbroker.h"
#include "AmqpManager.h"
#include "AwsTools.h"
#include "ConfigManager.h"
#include "DatabaseManager.h"
#include "DeliveryBroker.h"
#include "GlobalTools.h"
#include "Tools.h"

#include "rust/cxx.h"
#include "tunnelbroker/src/cxx_bridge.rs.h"

#include <glog/logging.h>

void initialize() {
  comm::network::tools::InitLogging("tunnelbroker");
  comm::network::config::ConfigManager::getInstance().load();
  Aws::InitAPI({});
  // List of AWS DynamoDB tables to check if they are created and can be
  // accessed before any AWS API methods
  const std::list<std::string> tablesList = {
      comm::network::config::ConfigManager::getInstance().getParameter(
          comm::network::config::ConfigManager::OPTION_DYNAMODB_SESSIONS_TABLE),
      comm::network::config::ConfigManager::getInstance().getParameter(
          comm::network::config::ConfigManager::
              OPTION_DYNAMODB_SESSIONS_VERIFICATION_TABLE),
      comm::network::config::ConfigManager::getInstance().getParameter(
          comm::network::config::ConfigManager::
              OPTION_DYNAMODB_SESSIONS_PUBLIC_KEY_TABLE),
      comm::network::config::ConfigManager::getInstance().getParameter(
          comm::network::config::ConfigManager::
              OPTION_DYNAMODB_MESSAGES_TABLE)};
  for (const std::string &table : tablesList) {
    if (!comm::network::database::DatabaseManager::getInstance()
             .isTableAvailable(table)) {
      throw std::runtime_error(
          "Error: AWS DynamoDB table '" + table + "' is not available");
    }
  };
  comm::network::AmqpManager::getInstance().init();
}

rust::String getConfigParameter(rust::Str parameter) {
  return rust::String{
      comm::network::config::ConfigManager::getInstance().getParameter(
          std::string{parameter})};
}

bool isConfigParameterSet(rust::Str parameter) {
  return comm::network::config::ConfigManager::getInstance().isParameterSet(
      std::string{parameter});
}

bool isSandbox() {
  return comm::network::tools::isSandbox();
}

SessionSignatureResult sessionSignatureHandler(rust::Str deviceID) {
  const std::string requestedDeviceID(deviceID);
  if (!comm::network::tools::validateDeviceID(requestedDeviceID)) {
    return SessionSignatureResult{
        .grpcStatus = {
            .statusCode = GRPCStatusCodes::InvalidArgument,
            .errorText =
                "Format validation failed for deviceID: " + requestedDeviceID}};
  }
  const std::string toSign = comm::network::tools::generateRandomString(
      comm::network::SIGNATURE_REQUEST_LENGTH);
  std::shared_ptr<comm::network::database::SessionSignItem> SessionSignItem =
      std::make_shared<comm::network::database::SessionSignItem>(
          toSign, requestedDeviceID);
  comm::network::database::DatabaseManager::getInstance().putSessionSignItem(
      *SessionSignItem);

  return SessionSignatureResult{
      .toSign = toSign, .grpcStatus = {.statusCode = GRPCStatusCodes::Ok}};
}

rust::String getSavedNonceToSign(rust::Str deviceID) {
  const auto sessionSignatureItem =
      comm::network::database::DatabaseManager::getInstance()
          .findSessionSignItem(std::string{deviceID});
  if (sessionSignatureItem == nullptr) {
    throw std::invalid_argument(
        "No requests found for 'deviceID': " + std::string{deviceID});
  };
  return rust::String{sessionSignatureItem->getSign()};
}

NewSessionResult newSessionHandler(
    rust::Str deviceID,
    rust::Str publicKey,
    int32_t deviceType,
    rust::Str deviceAppVersion,
    rust::Str deviceOS,
    rust::Str notifyToken) {
  std::shared_ptr<comm::network::database::DeviceSessionItem> deviceSessionItem;
  std::shared_ptr<comm::network::database::SessionSignItem> sessionSignItem;
  std::shared_ptr<comm::network::database::PublicKeyItem> publicKeyItem;
  const std::string stringDeviceID{deviceID};
  if (!comm::network::tools::validateDeviceID(stringDeviceID)) {
    return NewSessionResult{
        .grpcStatus = {
            .statusCode = GRPCStatusCodes::InvalidArgument,
            .errorText = "Format validation failed for deviceID"}};
  }
  const std::string stringPublicKey{publicKey};
  const std::string newSessionID = comm::network::tools::generateUUID();
  try {
    publicKeyItem = comm::network::database::DatabaseManager::getInstance()
                        .findPublicKeyItem(stringDeviceID);
    if (publicKeyItem == nullptr) {
      std::shared_ptr<comm::network::database::PublicKeyItem> newPublicKeyItem =
          std::make_shared<comm::network::database::PublicKeyItem>(
              stringDeviceID, stringPublicKey);
      comm::network::database::DatabaseManager::getInstance().putPublicKeyItem(
          *newPublicKeyItem);
    } else if (stringPublicKey != publicKeyItem->getPublicKey()) {
      return NewSessionResult{
          .grpcStatus = {
              .statusCode = GRPCStatusCodes::PermissionDenied,
              .errorText = "The public key doesn't match for deviceID"}};
    }
    comm::network::database::DatabaseManager::getInstance()
        .removeSessionSignItem(stringDeviceID);

    deviceSessionItem =
        std::make_shared<comm::network::database::DeviceSessionItem>(
            newSessionID,
            stringDeviceID,
            stringPublicKey,
            std::string{notifyToken},
            deviceType,
            std::string{deviceAppVersion},
            std::string{deviceOS});
    comm::network::database::DatabaseManager::getInstance().putSessionItem(
        *deviceSessionItem);
  } catch (std::runtime_error &e) {
    LOG(ERROR) << "gRPC: "
               << "Error while processing 'NewSession' request: " << e.what();
    return NewSessionResult{
        .grpcStatus = {
            .statusCode = GRPCStatusCodes::Internal, .errorText = e.what()}};
  }
  return NewSessionResult{
      .sessionID = newSessionID,
      .grpcStatus = {.statusCode = GRPCStatusCodes::Ok}};
}

SessionItem getSessionItem(rust::Str sessionID) {
  const std::string stringSessionID = std::string{sessionID};
  if (!comm::network::tools::validateSessionID(stringSessionID)) {
    throw std::invalid_argument("Invalid format for 'sessionID'");
  }
  std::shared_ptr<comm::network::database::DeviceSessionItem> sessionItem =
      comm::network::database::DatabaseManager::getInstance().findSessionItem(
          stringSessionID);
  if (sessionItem == nullptr) {
    throw std::invalid_argument(
        "No sessions found for 'sessionID': " + stringSessionID);
  }
  return SessionItem{
      .deviceID = sessionItem->getDeviceID(),
      .publicKey = sessionItem->getPubKey(),
      .notifyToken = sessionItem->getNotifyToken(),
      .deviceType = static_cast<int>(sessionItem->getDeviceType()),
      .appVersion = sessionItem->getAppVersion(),
      .deviceOS = sessionItem->getDeviceOs(),
      .isOnline = sessionItem->getIsOnline()};
}

void updateSessionItemIsOnline(rust::Str sessionID, bool isOnline) {
  if (comm::network::config::ConfigManager::getInstance().isParameterSet(
          comm::network::config::ConfigManager::
              OPTION_SESSIONS_SKIP_AUTH_KEY)) {
    return;
  }
  comm::network::database::DatabaseManager::getInstance()
      .updateSessionItemIsOnline(std::string{sessionID}, isOnline);
}

void updateSessionItemDeviceToken(
    rust::Str sessionID,
    rust::Str newNotifToken) {
  if (comm::network::config::ConfigManager::getInstance().isParameterSet(
          comm::network::config::ConfigManager::
              OPTION_SESSIONS_SKIP_AUTH_KEY)) {
    return;
  }
  comm::network::database::DatabaseManager::getInstance()
      .updateSessionItemDeviceToken(
          std::string{sessionID}, std::string{newNotifToken});
}

rust::Vec<MessageItem> getMessagesFromDatabase(rust::Str deviceID) {
  std::vector<std::shared_ptr<comm::network::database::MessageItem>>
      messagesFromDatabase =
          comm::network::database::DatabaseManager::getInstance()
              .findMessageItemsByReceiver(std::string{deviceID});
  rust::Vec<MessageItem> result;
  for (auto &messageFromDatabase : messagesFromDatabase) {
    result.push_back(MessageItem{
        .messageID = messageFromDatabase->getMessageID(),
        .fromDeviceID = messageFromDatabase->getFromDeviceID(),
        .payload = messageFromDatabase->getPayload(),
        .blobHashes = messageFromDatabase->getBlobHashes(),
    });
  }
  return result;
}

void eraseMessagesFromAMQP(rust::Str deviceID) {
  comm::network::DeliveryBroker::getInstance().erase(std::string{deviceID});
}

void ackMessageFromAMQP(uint64_t deliveryTag) {
  comm::network::AmqpManager::getInstance().ack(deliveryTag);
}

MessageItem waitMessageFromDeliveryBroker(rust::Str deviceID) {
  const auto message =
      comm::network::DeliveryBroker::getInstance().pop(std::string{deviceID});
  return MessageItem{
      .messageID = message.messageID,
      .fromDeviceID = message.fromDeviceID,
      .payload = message.payload,
      .deliveryTag = message.deliveryTag};
}

void removeMessages(
    rust::Str deviceID,
    const rust::Vec<rust::String> &messagesIDs) {
  std::vector<std::string> vectorOfmessagesIDs;
  for (auto id : messagesIDs) {
    vectorOfmessagesIDs.push_back(std::string{id});
  };
  comm::network::database::DatabaseManager::getInstance()
      .removeMessageItemsByIDsForDeviceID(
          vectorOfmessagesIDs, std::string{deviceID});
}

void deleteDeliveryBrokerQueueIfEmpty(rust::Str deviceID) {
  // If messages queue for `deviceID` is empty we don't need to store
  // `folly::MPMCQueue` for it and need to free memory to fix possible
  // 'ghost' queues in DeliveryBroker.
  // We call `deleteQueueIfEmpty()` for this purpose here after removing
  // messages.
  comm::network::DeliveryBroker::DeliveryBroker::getInstance()
      .deleteQueueIfEmpty(std::string{deviceID});
}

rust::Vec<rust::String> sendMessages(const rust::Vec<MessageItem> &messages) {
  std::vector<comm::network::database::MessageItem> vectorOfMessages;
  rust::Vec<rust::String> messagesIDs;
  for (auto &message : messages) {
    std::string messageID = comm::network::tools::generateUUID();
    vectorOfMessages.push_back(comm::network::database::MessageItem{
        comm::network::database::MessageItem{
            messageID,
            std::string{message.fromDeviceID},
            std::string{message.toDeviceID},
            std::string{message.payload},
            std::string{message.blobHashes},
        }});
    messagesIDs.push_back(rust::String{messageID});
  };
  if (!comm::network::config::ConfigManager::getInstance().isParameterSet(
          comm::network::config::ConfigManager::
              OPTION_MESSAGES_SKIP_PERSISTENCE)) {
    comm::network::database::DatabaseManager::getInstance()
        .putMessageItemsByBatch(vectorOfMessages);
  };
  for (auto message : vectorOfMessages) {
    comm::network::AmqpManager::getInstance().send(&message);
  }
  return messagesIDs;
}
