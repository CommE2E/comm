#include <CryptoTools/Tools.h>
#include <Tools/PlatformSpecificTools.h>

#include <string>

namespace comm {
namespace crypto {

std::string
Tools::generateRandomString(size_t size, const std::string &availableSigns) {
  std::string result;
  OlmBuffer buff;
  PlatformSpecificTools::generateSecureRandomBytes(buff, size);
  for (size_t i = 0; i < size; ++i) {
    std::uint8_t rand = buff[i] % availableSigns.size();
    result.push_back(availableSigns[rand]);
  }
  return result;
}

std::string Tools::generateRandomString(size_t size) {
  static std::string defaultSigns =
      " 0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_";
  return Tools::generateRandomString(size, defaultSigns);
}

std::string Tools::generateRandomHexString(size_t size) {
  static std::string hexSigns = "0123456789ABCDEF";
  return Tools::generateRandomString(size, hexSigns);
}

} // namespace crypto
} // namespace comm
