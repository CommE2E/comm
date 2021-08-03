#include "Tools.h"

#include <random>
#include <string>

namespace comm {
namespace crypto {

Tools::Tools() {
  std::random_device rd;
  mt = std::mt19937(rd());
}

std::string Tools::generateRandomString(size_t size) {
  static std::string availableSigns =
      " 01234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  static std::uniform_int_distribution<int> randomStringUid(
      0, availableSigns.size() - 1);
  std::string result;
  for (size_t i = 0; i < size; ++i) {
    result.push_back(availableSigns[randomStringUid(this->mt)]);
  }
  return result;
}

unsigned char Tools::generateRandomByte() {
  static std::uniform_int_distribution<int> randomByteUid(0, 255);
  return (unsigned char)randomByteUid(this->mt);
}

void Tools::generateRandomBytes(OlmBuffer &buffer, size_t size) {
  buffer.resize(size);

  for (size_t i = 0; i < size; ++i) {
    buffer[i] = generateRandomByte();
  }
}

} // namespace crypto
} // namespace comm
