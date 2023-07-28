#import "CommIOSNotificationsBlobClient.h"
#import "Logger.h"

NSString const *blobServiceAddress = @"https://blob.commtechnologies.org";
int const blobServiceQueryTimeLimit = 15;

@interface CommIOSNotificationsBlobClient ()
@property(nonatomic, strong) NSURLSession *sharedBlobServiceSession;
@end

@implementation CommIOSNotificationsBlobClient

+ (id)sharedInstance {
  static CommIOSNotificationsBlobClient *sharedBlobServiceClient = nil;
  static dispatch_once_t onceToken;

  dispatch_once(&onceToken, ^{
    NSURLSessionConfiguration *config =
        [NSURLSessionConfiguration ephemeralSessionConfiguration];
    // TODO: put necessary authentication into session config
    [config setTimeoutIntervalForRequest:blobServiceQueryTimeLimit];
    NSURLSession *session =
        [NSURLSession sessionWithConfiguration:config
                                      delegate:nil
                                 delegateQueue:[NSOperationQueue mainQueue]];
    sharedBlobServiceClient = [[self alloc] init];
    sharedBlobServiceClient.sharedBlobServiceSession = session;
  });
  return sharedBlobServiceClient;
}

- (void)getAndConsumeSync:(NSString *)blobHash
      withSuccessConsumer:(void (^)(NSData *))successConsumer {
  NSError *authTokenError = nil;
  NSString *authToken =
      [CommIOSNotificationsBlobClient _getAuthToken:&authTokenError];

  if (authTokenError) {
    comm::Logger::log(
        "Failed to create blob service auth token. Reason: " +
        std::string([authTokenError.localizedDescription UTF8String]));
    return;
  }

  NSString *blobUrlStr = [blobServiceAddress
      stringByAppendingString:[@"/blob/" stringByAppendingString:blobHash]];
  NSURL *blobUrl = [NSURL URLWithString:blobUrlStr];
  NSMutableURLRequest *blobRequest =
      [NSMutableURLRequest requestWithURL:blobUrl];

  // This is slightly against Apple docs:
  // https://developer.apple.com/documentation/foundation/nsurlrequest?language=objc#1776617
  // but apparently there is no other way to
  // do this and even Apple staff members
  // advice to set this field manually to
  // achieve token based authentication:
  // https://developer.apple.com/forums/thread/89811
  [blobRequest setValue:authToken forHTTPHeaderField:@"Authorization"];

  dispatch_semaphore_t semaphore = dispatch_semaphore_create(0);
  NSURLSessionDataTask *task = [self.sharedBlobServiceSession
      dataTaskWithRequest:blobRequest
        completionHandler:^(
            NSData *_Nullable data,
            NSURLResponse *_Nullable response,
            NSError *_Nullable error) {
          if (error) {
            comm::Logger::log(
                "Failed to download blob from blob service. Reason: " +
                std::string([error.localizedDescription UTF8String]));
            dispatch_semaphore_signal(semaphore);
            return;
          }

          successConsumer(data);
          dispatch_semaphore_signal(semaphore);
        }];

  [task resume];
  dispatch_semaphore_wait(
      semaphore,
      dispatch_time(
          DISPATCH_TIME_NOW,
          (int64_t)(blobServiceQueryTimeLimit * NSEC_PER_SEC)));
}

+ (NSString *)_getAuthToken:(NSError **)error {
  // Authentication data are retrieved on every request
  // since they might change while NSE process is running
  // so we should not rely on caching them in memory.

  // TODO: retrieve those values from CommSecureStore
  NSString *userID = @"placeholder";
  NSString *accessToken = @"placeholder";
  NSString *deviceID = @"placeholder";

  NSDictionary *jsonAuthObject = @{
    @"userID" : userID,
    @"accessToken" : accessToken,
    @"deviceID" : deviceID,
  };

  NSData *binaryAuthObject = nil;
  NSError *jsonError = nil;

  @try {
    binaryAuthObject = [NSJSONSerialization dataWithJSONObject:jsonAuthObject
                                                       options:0
                                                         error:&jsonError];
  } @catch (NSException *e) {
    *error = [NSError errorWithDomain:@"app.comm"
                                 code:NSFormattingError
                             userInfo:@{NSLocalizedDescriptionKey : e.reason}];
    return nil;
  }

  if (jsonError) {
    *error = jsonError;
    return nil;
  }

  return [@"Bearer "
      stringByAppendingString:[binaryAuthObject
                                  base64EncodedStringWithOptions:0]];
}

@end
