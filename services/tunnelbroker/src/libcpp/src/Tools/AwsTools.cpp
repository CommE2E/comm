#include "AwsTools.h"
#include "Constants.h"

#include <boost/program_options.hpp>

#include <fstream>

namespace comm {
namespace network {

Aws::String getAwsRegionFromCredentials() {
  const std::string regionParameter = "default.region";
  const std::string awsCredentialsPath = "~/.aws/credentials";
  std::ifstream fileStream;
  fileStream.open(awsCredentialsPath, std::ifstream::in);
  if (!fileStream.is_open()) {
    throw std::runtime_error(
        "Error: can not open AWS credentials file " + awsCredentialsPath);
  }

  boost::program_options::options_description optionDescription{
      "AWS credentials options"};
  optionDescription.add_options()(
      regionParameter.c_str(),
      boost::program_options::value<std::string>(),
      "AWS region");

  boost::program_options::parsed_options parsedDescription =
      boost::program_options::parse_config_file(
          fileStream, optionDescription, true);
  boost::program_options::variables_map variablesMap;
  boost::program_options::store(parsedDescription, variablesMap);
  boost::program_options::notify(variablesMap);
  fileStream.close();
  return variablesMap[regionParameter].as<std::string>();
}

} // namespace network
} // namespace comm
