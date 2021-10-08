#include "Tools.h"
#include "PlatformSpecificTools.h"

#include <string>

namespace comm {
namespace crypto {

std::string Tools::generateRandomString(size_t size) {
  static std::string availableSigns =
      " 0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  std::string result;
  OlmBuffer buff;
  PlatformSpecificTools::generateSecureRandomBytes(buff, size);
  for (size_t i = 0; i < size; ++i) {
    std::uint8_t rand = buff[i] % availableSigns.size();
    result.push_back(availableSigns[rand]);
  }
  return result;
}

} // namespace crypto
} // namespace comm
