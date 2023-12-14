#import "CommServicesAuthMetadataEmitter.h"

#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

NSString *const commServicesAuthMetadata = @"commServicesAuthMetadata";

@interface CommServicesAuthMetadataEmitterIOSWrapper
    : RCTEventEmitter <RCTBridgeModule>
@property(nonatomic) BOOL hasListeners;

+ (void)sendAccessTokenToJS:(NSString *)accessToken
                 withUserID:(NSString *)userID;
@end

@implementation CommServicesAuthMetadataEmitterIOSWrapper

RCT_EXPORT_MODULE(CommServicesAuthMetadataEmitter);

static CommServicesAuthMetadataEmitterIOSWrapper *sharedInstance = nil;

- (instancetype)init {
  self = [super init];
  if (!self) {
    return self;
  }
  _hasListeners = NO;
  return self;
}

- (void)startObserving {
  @synchronized([self class]) {
    _hasListeners = YES;
    sharedInstance = self;
  }
}

- (void)stopObserving {
  @synchronized([self class]) {
    _hasListeners = NO;
    sharedInstance = nil;
  }
}

- (NSArray<NSString *> *)supportedEvents {
  return @[ commServicesAuthMetadata ];
}

- (NSDictionary *)constantsToExport {
  return @{@"COMM_SERVICES_AUTH_METADATA" : commServicesAuthMetadata};
}

+ (BOOL)requiresMainQueueSetup {
  return YES;
}

+ (void)sendAccessTokenToJS:(NSString *)accessToken
                 withUserID:(NSString *)userID {
  @synchronized([self class]) {
    if (!sharedInstance) {
      return;
    }

    // Event body must match UserLoginResponse
    // type from 'lib/types/identity-service-types.js'
    NSDictionary *eventBody =
        @{@"accessToken" : accessToken, @"userID" : userID};

    [sharedInstance sendEventWithName:commServicesAuthMetadata body:eventBody];
  }
}

@end

namespace comm {

void CommServicesAuthMetadataEmitter::sendAuthMetadataToJS(
    rust::String accessToken,
    rust::String userID) {
  NSString *accessTokenObjC =
      [NSString stringWithCString:std::string(accessToken).c_str()
                         encoding:NSUTF8StringEncoding];
  NSString *userIDObjC = [NSString stringWithCString:std::string(userID).c_str()
                                            encoding:NSUTF8StringEncoding];

  [CommServicesAuthMetadataEmitterIOSWrapper sendAccessTokenToJS:accessTokenObjC
                                                      withUserID:userIDObjC];
}
} // namespace comm
