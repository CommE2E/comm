#include "Tunnelbroker.h"
#include "AmqpManager.h"
#include "AwsTools.h"
#include "ConfigManager.h"
#include "CryptoTools.h"
#include "DatabaseManager.h"
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

SessionSignatureResult sessionSignatureHandler(rust::Str deviceID) {
  const std::string requestedDeviceID(deviceID);
  if (!comm::network::tools::validateDeviceID(requestedDeviceID)) {
    return SessionSignatureResult{
        .grpcStatus = {
            .statusCode = 3,
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

  return SessionSignatureResult{.toSign = toSign};
}

NewSessionResult newSessionHandler(
    rust::Str deviceID,
    rust::Str publicKey,
    rust::Str signature,
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
            .statusCode = 3,
            .errorText = "Format validation failed for deviceID"}};
  }
  const std::string stringPublicKey{publicKey};
  const std::string newSessionID = comm::network::tools::generateUUID();
  try {
    sessionSignItem = comm::network::database::DatabaseManager::getInstance()
                          .findSessionSignItem(stringDeviceID);
    if (sessionSignItem == nullptr) {
      return NewSessionResult{
          .grpcStatus = {
              .statusCode = 5,
              .errorText = "Session signature request not found for deviceID"}};
    }
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
              .statusCode = 7,
              .errorText = "The public key doesn't match for deviceID"}};
    }
    const std::string verificationMessage = sessionSignItem->getSign();
    if (!comm::network::crypto::rsaVerifyString(
            stringPublicKey, verificationMessage, std::string{signature})) {
      return NewSessionResult{
          .grpcStatus = {
              .statusCode = 7,
              .errorText =
                  "Signature for the verification message is not valid"}};
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
        .grpcStatus = {.statusCode = 13, .errorText = e.what()}};
  }
  return NewSessionResult{.sessionID = newSessionID};
}
