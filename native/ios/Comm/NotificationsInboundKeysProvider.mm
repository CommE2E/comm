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
  // There are several reason to return JSON with curve25519 only:
  //    1. We only need curve25519 to create inbound session.
  //    2. In Session.cpp there is a convention to pass curve25519
  //       key as JSON and then add offset length to advance
  //       the string pointer.
  //    3. There is a risk that stringification might not preserve
  //       the order.
  return folly::toJson(folly::dynamic::object("curve25519", curve25519));
}
} // namespace comm
