#import "CommSecureStore.h"
#import <Foundation/Foundation.h>
#import <stdexcept>

#import "CommSecureStoreIOSWrapper.h"

namespace comm {

void CommSecureStore::set(const std::string key, const std::string value) {
  NSString *nsKey =
      [NSString stringWithCString:key.c_str()
                         encoding:[NSString defaultCStringEncoding]];
  NSString *nsValue =
      [NSString stringWithCString:value.c_str()
                         encoding:[NSString defaultCStringEncoding]];
  [[CommSecureStoreIOSWrapper sharedInstance] set:nsKey value:nsValue];
}

folly::Optional<std::string> CommSecureStore::get(const std::string key) {
  NSString *nsKey =
      [NSString stringWithCString:key.c_str()
                         encoding:[NSString defaultCStringEncoding]];
  NSString *result = [[CommSecureStoreIOSWrapper sharedInstance] get:nsKey];
  return (result != nil)
      ? folly::Optional<std::string>(std::string([result UTF8String]))
      : folly::none;
}

}; // namespace comm
