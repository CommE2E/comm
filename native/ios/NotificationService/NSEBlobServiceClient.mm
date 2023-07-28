#import "NSEBlobServiceClient.h"
#import "Logger.h"

NSString const *blobServiceAddress = @"https://blob.commtechnologies.org";
int const blobServiceQueryTimeLimit = 15;

@interface NSEBlobServiceClient ()
@property(nonatomic, strong) NSURLSession *sharedBlobServiceSession;
@end

@implementation NSEBlobServiceClient

static NSURLSession *sharedBlobServiceSession = nil;

+ (id)sharedInstance {
  static NSEBlobServiceClient *sharedBlobServiceClient = nil;
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
  NSString *blobUrlStr = [blobServiceAddress
      stringByAppendingString:[@"/blob/" stringByAppendingString:blobHash]];
  NSURL *blobUrl = [NSURL URLWithString:blobUrlStr];
  NSURLRequest *blobRequest = [NSURLRequest requestWithURL:blobUrl];

  dispatch_semaphore_t semaphore = dispatch_semaphore_create(0);
  NSURLSessionDataTask *task = [self.sharedBlobServiceSession
      dataTaskWithRequest:blobRequest
        completionHandler:^(
            NSData *_Nullable data,
            NSURLResponse *_Nullable response,
            NSError *_Nullable error) {
          if (error) {
            comm::Logger::log(
                "NSE: Failed to download blob from blob service. Reason: " +
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

@end
