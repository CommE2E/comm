#pragma once

#include <boost/program_options.hpp>

#include <string>

namespace comm {
namespace network {
namespace config {

class ConfigManager {
private:
  boost::program_options::variables_map variablesMap;
  void loadConfigFile(const std::string configFilePath);

public:
  static const std::string OPTION_TUNNELBROKER_ID;
  static const std::string OPTION_DEFAULT_KEYSERVER_ID;
  static const std::string OPTION_AMQP_URI;
  static const std::string OPTION_AMQP_FANOUT_EXCHANGE;
  static const std::string OPTION_DYNAMODB_SESSIONS_TABLE;
  static const std::string OPTION_DYNAMODB_SESSIONS_VERIFICATION_TABLE;
  static const std::string OPTION_DYNAMODB_SESSIONS_PUBLIC_KEY_TABLE;
  static const std::string OPTION_DYNAMODB_MESSAGES_TABLE;
  static const std::string OPTION_NOTIFS_APNS_P12_CERT_PATH;
  static const std::string OPTION_NOTIFS_APNS_P12_CERT_PASSWORD;
  static const std::string OPTION_NOTIFS_APNS_TOPIC;
  static const std::string OPTION_NOTIFS_FCM_SERVER_KEY;
  static const std::string OPTION_SESSIONS_SKIP_AUTH_KEY;
  static const std::string OPTION_DISABLE_DEVICEID_VALIDATION;
  static const std::string OPTION_MESSAGES_SKIP_PERSISTENCE;

  static ConfigManager &getInstance();
  void load();
  std::string getParameter(std::string param);
  bool isParameterSet(std::string param);
};

} // namespace config
} // namespace network
} // namespace comm
