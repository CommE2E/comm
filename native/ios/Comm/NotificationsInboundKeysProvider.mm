#import "NotificationsInboundKeysProvider.h"
#import "CommIOSServices/CommIOSServicesClient.h"
#include <folly/dynamic.h>
#include <folly/json.h>

namespace comm {
std::string NotificationsInboundKeysProvider::getNotifsInboundKeysForDeviceID(
    const std::string &deviceID) {
  NSError *error = nil;
  NSDictionary *notifInboundKeys = [CommIOSServicesClient.sharedInstance
      getNotifsIdentityKeysFor:[NSString stringWithCString:deviceID.c_str()
                                                  encoding:NSUTF8StringEncoding]
                    orSetError:&error];
  if (error) {
    throw std::runtime_error(
        "Failed to fetch notifs inbound keys for device: " + deviceID +
        ". Details: " + std::string([error.localizedDescription UTF8String]));
  }

  std::string curve25519 =
      std::string([notifInboundKeys[@"curve25519"] UTF8String]);
  return curve25519;
}
} // namespace comm
