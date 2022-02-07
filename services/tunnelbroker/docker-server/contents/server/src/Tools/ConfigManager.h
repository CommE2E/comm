#pragma once

#include <boost/program_options.hpp>

#include <iostream>
#include <string>

namespace comm {
namespace network {
namespace config {

class ConfigManager {
private:
  boost::program_options::variables_map variablesMap;

public:
  static const std::string OPTION_TUNNELBROKER_ID;
  static const std::string OPTION_DEFAULT_KEYSERVER_ID;
  static const std::string OPTION_AMQP_URI;
  static const std::string OPTION_AMQP_FANOUT_EXCHANGE;
  static const std::string OPTION_DYNAMODB_SESSIONS_TABLE;
  static const std::string OPTION_DYNAMODB_SESSIONS_VERIFICATION_TABLE;
  static const std::string OPTION_DYNAMODB_SESSIONS_PUBLIC_KEY_TABLE;

  static ConfigManager &getInstance();
  void load();
  std::string getParameter(std::string param);
};

} // namespace config
} // namespace network
} // namespace comm
