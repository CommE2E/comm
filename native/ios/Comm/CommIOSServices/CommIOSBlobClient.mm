#import "CommIOSBlobClient.h"
#import "CommSecureStore.h"
#import "Logger.h"

#ifdef DEBUG
NSString const *blobServiceAddress =
    @"https://blob.staging.commtechnologies.org";
#else
NSString const *blobServiceAddress = @"https://blob.commtechnologies.org";
#endif

int const blobServiceQueryTimeLimit = 15;

@interface CommIOSBlobClient ()
@property(nonatomic, strong) NSURLSession *sharedBlobServiceSession;
@end

@implementation CommIOSBlobClient

+ (id)sharedInstance {
  static CommIOSBlobClient *sharedBlobServiceClient = nil;
  static dispatch_once_t onceToken;

  dispatch_once(&onceToken, ^{
    NSURLSessionConfiguration *config =
        [NSURLSessionConfiguration ephemeralSessionConfiguration];

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

- (NSData *)getBlobSync:(NSString *)blobHash orSetError:(NSError **)error {
  NSError *authTokenError = nil;
  NSString *authToken =
      [CommIOSBlobClient _getAuthTokenOrSetError:&authTokenError];

  if (authTokenError) {
    *error = authTokenError;
    return nil;
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

  __block NSError *requestError = nil;
  __block NSData *blobContent = nil;

  dispatch_semaphore_t semaphore = dispatch_semaphore_create(0);
  NSURLSessionDataTask *task = [self.sharedBlobServiceSession
      dataTaskWithRequest:blobRequest
        completionHandler:^(
            NSData *_Nullable data,
            NSURLResponse *_Nullable response,
            NSError *_Nullable error) {
          @try {
            NSHTTPURLResponse *httpResponse = (NSHTTPURLResponse *)response;
            if (httpResponse.statusCode > 299) {
              NSString *errorMessage =
                  [@"Fetching blob failed with the following reason: "
                      stringByAppendingString:[NSHTTPURLResponse
                                                  localizedStringForStatusCode:
                                                      httpResponse.statusCode]];
              requestError = [NSError
                  errorWithDomain:@"app.comm"
                             code:httpResponse.statusCode
                         userInfo:@{NSLocalizedDescriptionKey : errorMessage}];
              dispatch_semaphore_signal(semaphore);
              return;
            }
            if (error) {
              requestError = error;
              return;
            }
            blobContent = data;
          } @catch (NSException *exception) {
            comm::Logger::log(
                "Received exception when fetching blob. Details: " +
                std::string([exception.reason UTF8String]));
          } @finally {
            dispatch_semaphore_signal(semaphore);
          }
        }];

  [task resume];
  dispatch_semaphore_wait(
      semaphore,
      dispatch_time(
          DISPATCH_TIME_NOW,
          (int64_t)(blobServiceQueryTimeLimit * NSEC_PER_SEC)));
  if (requestError) {
    *error = requestError;
    return nil;
  }
  return blobContent;
}

+ (NSString *)_getAuthTokenOrSetError:(NSError **)error {
  // Authentication data are retrieved on every request
  // since they might change while NSE process is running
  // so we should not rely on caching them in memory.

  auto accessToken = comm::CommSecureStore::get(
      comm::CommSecureStore::commServicesAccessToken);
  auto userID = comm::CommSecureStore::get(comm::CommSecureStore::userID);
  auto deviceID = comm::CommSecureStore::get(comm::CommSecureStore::deviceID);

  NSString *userIDObjC = userID.hasValue()
      ? [NSString stringWithCString:userID.value().c_str()
                           encoding:NSUTF8StringEncoding]
      : @"";
  NSString *accessTokenObjC = accessToken.hasValue()
      ? [NSString stringWithCString:accessToken.value().c_str()
                           encoding:NSUTF8StringEncoding]
      : @"";
  NSString *deviceIDObjC = deviceID.hasValue()
      ? [NSString stringWithCString:deviceID.value().c_str()
                           encoding:NSUTF8StringEncoding]
      : @"";

  NSDictionary *jsonAuthObject = @{
    @"userID" : userIDObjC,
    @"accessToken" : accessTokenObjC,
    @"deviceID" : deviceIDObjC,
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
