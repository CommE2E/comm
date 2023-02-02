#include "ConfigManager.h"
#include "Constants.h"
#include "GlobalTools.h"

#include <fstream>

namespace comm {
namespace network {
namespace config {

const std::string ConfigManager::OPTION_TUNNELBROKER_ID =
    "tunnelbroker.instance-id";
const std::string ConfigManager::OPTION_DEFAULT_KEYSERVER_ID =
    "keyserver.default_keyserver_id";
const std::string ConfigManager::OPTION_AMQP_URI = "amqp.uri";
const std::string ConfigManager::OPTION_AMQP_FANOUT_EXCHANGE =
    "amqp.fanout_exchange_name";
const std::string ConfigManager::OPTION_DYNAMODB_SESSIONS_TABLE =
    "dynamodb.sessions_table_name";
const std::string ConfigManager::OPTION_DYNAMODB_SESSIONS_VERIFICATION_TABLE =
    "dynamodb.sessions_verification_table_name";
const std::string ConfigManager::OPTION_DYNAMODB_SESSIONS_PUBLIC_KEY_TABLE =
    "dynamodb.sessions_public_key_table_name";
const std::string ConfigManager::OPTION_DYNAMODB_MESSAGES_TABLE =
    "dynamodb.messages_table_name";
const std::string ConfigManager::OPTION_NOTIFS_APNS_P12_CERT_PATH =
    "notifications.apns_cert_path";
const std::string ConfigManager::OPTION_NOTIFS_APNS_P12_CERT_PASSWORD =
    "notifications.apns_cert_password";
const std::string ConfigManager::OPTION_NOTIFS_APNS_TOPIC =
    "notifications.apns_topic";
const std::string ConfigManager::OPTION_NOTIFS_FCM_SERVER_KEY =
    "notifications.fcm_server_key";
const std::string ConfigManager::OPTION_SESSIONS_SKIP_AUTH_KEY =
    "sessions.skip_authentication";
const std::string ConfigManager::OPTION_DISABLE_DEVICEID_VALIDATION =
    "sessions.disable_deviceid_validation";

ConfigManager &ConfigManager::getInstance() {
  static ConfigManager instance;
  return instance;
}

void ConfigManager::load() {
  char const *configFileDirectoryFromEnvironment =
      std::getenv(CONFIG_FILE_DIRECTORY_ENV_VARIABLE.c_str());
  std::string configFilePath = DEFAULT_CONFIG_FILE_DIRECTORY;

  if (configFileDirectoryFromEnvironment != nullptr) {
    configFilePath = std::string{configFileDirectoryFromEnvironment};
  }
  loadConfigFile(configFilePath + "/" + CONFIG_FILE_NAME);
}

void ConfigManager::loadConfigFile(const std::string configFilePath) {
  try {
    std::ifstream fileStream;
    fileStream.open(configFilePath.c_str(), std::ifstream::in);
    if (!fileStream.is_open()) {
      throw std::runtime_error("Error: can not open file " + configFilePath);
    }

    boost::program_options::options_description description{
        "Tunnelbroker options"};
    description.add_options()(
        this->OPTION_TUNNELBROKER_ID.c_str(),
        boost::program_options::value<std::string>()->required(),
        "Tunnelbroker unique identification");
    description.add_options()(
        this->OPTION_DEFAULT_KEYSERVER_ID.c_str(),
        boost::program_options::value<std::string>()->required(),
        "Default and only allowed keyserver deviceID");
    description.add_options()(
        this->OPTION_AMQP_URI.c_str(),
        boost::program_options::value<std::string>()->required(),
        "AMQP URI connection string");
    description.add_options()(
        this->OPTION_AMQP_FANOUT_EXCHANGE.c_str(),
        boost::program_options::value<std::string>()->default_value(
            AMQP_FANOUT_EXCHANGE_NAME),
        "AMQP Fanout exchange name");
    description.add_options()(
        this->OPTION_DYNAMODB_SESSIONS_TABLE.c_str(),
        boost::program_options::value<std::string>()->default_value(
            DEVICE_SESSIONS_TABLE_NAME),
        "DynamoDB table name for sessions");
    description.add_options()(
        this->OPTION_DYNAMODB_SESSIONS_VERIFICATION_TABLE.c_str(),
        boost::program_options::value<std::string>()->default_value(
            DEVICE_SESSIONS_VERIFICATION_MESSAGES_TABLE_NAME),
        "DynamoDB table name for sessions verification messages");
    description.add_options()(
        this->OPTION_DYNAMODB_SESSIONS_PUBLIC_KEY_TABLE.c_str(),
        boost::program_options::value<std::string>()->default_value(
            DEVICE_PUBLIC_KEY_TABLE_NAME),
        "DynamoDB table name for public keys");
    description.add_options()(
        this->OPTION_DYNAMODB_MESSAGES_TABLE.c_str(),
        boost::program_options::value<std::string>()->default_value(
            MESSAGES_TABLE_NAME),
        "DynamoDB table name for messages");

    description.add_options()(
        this->OPTION_NOTIFS_APNS_P12_CERT_PATH.c_str(),
        boost::program_options::value<std::string>()->required(),
        "P12 certificate path for iOS notifications");
    description.add_options()(
        this->OPTION_NOTIFS_APNS_P12_CERT_PASSWORD.c_str(),
        boost::program_options::value<std::string>()->required(),
        "P12 certificate password for iOS notifications");
    description.add_options()(
        this->OPTION_NOTIFS_APNS_TOPIC.c_str(),
        boost::program_options::value<std::string>()->required(),
        "APNs messages topic for iOS notifications");
    description.add_options()(
        this->OPTION_NOTIFS_FCM_SERVER_KEY.c_str(),
        boost::program_options::value<std::string>()->required(),
        "Firebase Cloud Messaging server key for Android notifications");

    description.add_options()(
        this->OPTION_SESSIONS_SKIP_AUTH_KEY.c_str(),
        "Skip sessions authentication mechanism");
    description.add_options()(
        this->OPTION_DISABLE_DEVICEID_VALIDATION.c_str(),
        "Disable deviceID format validation");

    boost::program_options::parsed_options parsedDescription =
        boost::program_options::parse_config_file(
            fileStream, description, true);
    boost::program_options::store(parsedDescription, this->variablesMap);
    boost::program_options::notify(this->variablesMap);
    fileStream.close();
  } catch (const std::exception &e) {
    throw std::runtime_error(
        "Got an exception at ConfigManager: " + std::string(e.what()));
  }
}

std::string ConfigManager::getParameter(std::string param) {
  if (!this->variablesMap.count(param) &&
      !this->variablesMap[param].defaulted()) {
    throw std::runtime_error(
        "ConfigManager Error: config parameter " + param + " is not set.");
  }
  const std::string parameterValue =
      this->variablesMap[param].as<std::string>();
  if (parameterValue.empty()) {
    throw std::runtime_error(
        "ConfigManager Error: config parameter " + param +
        " can not be empty.");
  }
  return parameterValue;
}

bool ConfigManager::isParameterSet(std::string param) {
  return this->variablesMap.count(param) != 0;
}

} // namespace config
} // namespace network
} // namespace comm
