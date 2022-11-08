#include "Tunnelbroker.h"
#include "AmqpManager.h"
#include "AwsTools.h"
#include "ConfigManager.h"
#include "DatabaseManager.h"
#include "GlobalTools.h"
#include "Tools.h"

#include "rust/cxx.h"
#include "tunnelbroker/src/cxx_bridge.rs.h"

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
