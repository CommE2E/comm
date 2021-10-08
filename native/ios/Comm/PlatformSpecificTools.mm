#import "PlatformSpecificTools.h"
#import <Foundation/Foundation.h>
#import <string>

namespace comm {

void PlatformSpecificTools::generateSecureRandomBytes(
    crypto::OlmBuffer &buffer,
    size_t size) {
  uint8_t randomBytes[size];

  const int status = SecRandomCopyBytes(kSecRandomDefault, size, randomBytes);
  if (status == errSecSuccess) {
    buffer = crypto::OlmBuffer(randomBytes, randomBytes + size);
  } else {
    throw std::runtime_error(
        "SecRandomCopyBytes failed for some reason, error code: " +
        std::to_string(status));
  }
}

};
