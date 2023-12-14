#import "CommServicesAuthMetadataEmitter.h"

#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

NSString *const commServicesAuthMetadata = @"commServicesAuthMetadata";

@interface CommServicesAuthMetadataEmitterIOSWrapper
    : RCTEventEmitter <RCTBridgeModule>
@property(nonatomic) BOOL hasListeners;

+ (void)sendToJSAccessToken:(NSString *)accessToken
                 withUserID:(NSString *)userID
               withDeviceID:(NSString *)deviceID;
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

+ (void)sendToJSAccessToken:(NSString *)accessToken
                 withUserID:(NSString *)userID
               withDeviceID:(NSString *)deviceID {
  @synchronized([self class]) {
    if (!sharedInstance) {
      return;
    }

    NSDictionary *eventBody = @{
      @"accessToken" : accessToken,
      @"userID" : userID,
      @"deviceID" : deviceID
    };

    [sharedInstance sendEventWithName:commServicesAuthMetadata body:eventBody];
  }
}

@end

namespace comm {

void CommServicesAuthMetadataEmitter::sendAuthMetadataToJS(
    rust::String accessToken,
    rust::String userID,
    rust::String deviceID) {
  NSString *accessTokenObjC =
      [NSString stringWithCString:std::string(accessToken).c_str()
                         encoding:NSUTF8StringEncoding];
  NSString *userIDObjC = [NSString stringWithCString:std::string(userID).c_str()
                                            encoding:NSUTF8StringEncoding];
  NSString *deviceIDObjC =
      [NSString stringWithCString:std::string(deviceID).c_str()
                         encoding:NSUTF8StringEncoding];

  [CommServicesAuthMetadataEmitterIOSWrapper sendToJSAccessToken:accessTokenObjC
                                                      withUserID:userIDObjC
                                                    withDeviceID:deviceIDObjC];
}
} // namespace comm
