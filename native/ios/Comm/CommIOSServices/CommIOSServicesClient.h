 #import <Foundation/Foundation.h>

@interface CommIOSServicesClient : NSObject
+ (id)sharedInstance;
- (NSData *)getBlobSync:(NSString *)blobHash orSetError:(NSError **)error;
- (NSDictionary *)getNotifsIdentityKeysFor:(NSString *)deviceID
                                orSetError:(NSError **)error;
- (void)deleteBlobAsyncWithHash:(NSString *)blobHash
                      andHolder:(NSString *)blobHolder
             withSuccessHandler:(void (^)())successHandler
              andFailureHandler:(void (^)(NSError *))failureHandler;
- (void)storeBlobForDeletionWithHash:(NSString *)blobHash
                           andHolder:(NSString *)blobHolder;
- (void)deleteStoredBlobs;
- (void)cancelOngoingRequests;
@end
