#import "CommIOSBlobClient.h"
#import "CommMMKV.h"
#import "CommSecureStore.h"
#import "Logger.h"

#ifdef DEBUG
NSString const *blobServiceAddress =
    @"https://blob.staging.commtechnologies.org";
#else
NSString const *blobServiceAddress = @"https://blob.commtechnologies.org";
#endif

int const blobServiceQueryTimeLimit = 15;
const std::string mmkvBlobHolderPrefix = "BLOB_HOLDER.";
// The blob service expects slightly different keys in
// delete reuqest payload than we use in notif payload
NSString *const blobServiceHashKey = @"blob_hash";
NSString *const blobServiceHolderKey = @"holder";

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

- (void)deleteBlobAsyncWithHash:(NSString *)blobHash
                      andHolder:(NSString *)blobHolder
             withSuccessHandler:(void (^)())successHandler
              andFailureHandler:(void (^)(NSError *))failureHandler {
  NSError *authTokenError = nil;
  NSString *authToken =
      [CommIOSBlobClient _getAuthTokenOrSetError:&authTokenError];

  if (authTokenError) {
    comm::Logger::log(
        "Failed to create blob service auth token. Reason: " +
        std::string([authTokenError.localizedDescription UTF8String]));
    return;
  }

  NSString *blobUrlStr = [blobServiceAddress stringByAppendingString:@"/blob"];
  NSURL *blobUrl = [NSURL URLWithString:blobUrlStr];

  NSMutableURLRequest *deleteRequest =
      [NSMutableURLRequest requestWithURL:blobUrl];

  [deleteRequest setValue:authToken forHTTPHeaderField:@"Authorization"];
  [deleteRequest setValue:@"application/json"
       forHTTPHeaderField:@"content-type"];

  deleteRequest.HTTPMethod = @"DELETE";
  deleteRequest.HTTPBody = [NSJSONSerialization dataWithJSONObject:@{
    blobServiceHolderKey : blobHolder,
    blobServiceHashKey : blobHash
  }
                                                           options:0
                                                             error:nil];

  NSURLSessionDataTask *task = [self.sharedBlobServiceSession
      dataTaskWithRequest:deleteRequest
        completionHandler:^(
            NSData *_Nullable data,
            NSURLResponse *_Nullable response,
            NSError *_Nullable error) {
          NSHTTPURLResponse *httpResponse = (NSHTTPURLResponse *)response;

          if (httpResponse.statusCode > 299) {
            NSString *errorMessage =
                [@"Deleting blob failed with the following reason: "
                    stringByAppendingString:[NSHTTPURLResponse
                                                localizedStringForStatusCode:
                                                    httpResponse.statusCode]];
            failureHandler([NSError
                errorWithDomain:@"app.comm"
                           code:httpResponse.statusCode
                       userInfo:@{NSLocalizedDescriptionKey : errorMessage}]);
            return;
          }

          if (error) {
            failureHandler(error);
            return;
          }

          successHandler();
        }];

  [task resume];
}

- (void)storeBlobForDeletionWithHash:(NSString *)blobHash
                           andHolder:(NSString *)blobHolder {
  std::string blobHashCpp = std::string([blobHash UTF8String]);
  std::string blobHolderCpp = std::string([blobHolder UTF8String]);

  std::string mmkvBlobHolderKey = mmkvBlobHolderPrefix + blobHolderCpp;
  comm::CommMMKV::setString(mmkvBlobHolderKey, blobHashCpp);
}

- (void)deleteStoredBlobs {
  std::vector<std::string> allKeys = comm::CommMMKV::getAllKeys();
  NSMutableArray<NSDictionary *> *blobsDataForDeletion =
      [[NSMutableArray alloc] init];

  for (const auto &key : allKeys) {
    if (key.size() <= mmkvBlobHolderPrefix.size() ||
        key.compare(0, mmkvBlobHolderPrefix.size(), mmkvBlobHolderPrefix)) {
      continue;
    }

    std::optional<std::string> blobHash = comm::CommMMKV::getString(key);
    if (!blobHash.has_value()) {
      continue;
    }
    std::string blobHolder = key.substr(mmkvBlobHolderPrefix.size());

    NSString *blobHolderObjC =
        [NSString stringWithCString:blobHolder.c_str()
                           encoding:NSUTF8StringEncoding];
    NSString *blobHashObjC =
        [NSString stringWithCString:blobHash.value().c_str()
                           encoding:NSUTF8StringEncoding];

    [self deleteBlobAsyncWithHash:blobHashObjC
        andHolder:blobHolderObjC
        withSuccessHandler:^{
          std::string mmkvBlobHolderKey = mmkvBlobHolderPrefix + blobHolder;
          comm::CommMMKV::removeKeys({mmkvBlobHolderKey});
        }
        andFailureHandler:^(NSError *error) {
          comm::Logger::log(
              "Failed to delete blob hash " + blobHash.value() +
              " from blob service. Details: " +
              std::string([error.localizedDescription UTF8String]));
        }];
  }
}

- (void)cancelOngoingRequests {
  [self.sharedBlobServiceSession
      getAllTasksWithCompletionHandler:^(
          NSArray<__kindof NSURLSessionTask *> *_Nonnull tasks) {
        for (NSURLSessionTask *task in tasks) {
          [task cancel];
        }
      }];
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
