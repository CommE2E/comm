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

std::string PlatformSpecificTools::getDeviceOS() {
  return std::string{"ios"};
}

std::string PlatformSpecificTools::getNotificationsCryptoAccountPath() {
  NSURL *groupUrl = [NSFileManager.defaultManager
      containerURLForSecurityApplicationGroupIdentifier:@"group.app.comm"];
  if (groupUrl == nil) {
    throw std::runtime_error(
        "Failed to resolve notifications crypto account path - could not find "
        "groupUrl");
  }
  return std::string(
      [[groupUrl
           URLByAppendingPathComponent:@"comm_notifications_crypto_account"]
              .path UTF8String]);
}

}; // namespace comm
