#import <Foundation/Foundation.h>

@interface CommIOSBlobClient : NSObject
+ (id)sharedInstance;
- (void)getBlobSync:(NSString *)blobHash
    withSuccessHandler:(void (^)(NSData *))successHandler
     andFailureHandler:(void (^)(NSError *))failureHandler;
- (void)deleteBlobAsyncWithHash:(NSString *)blobHash
                      andHolder:(NSString *)blobHolder
             withSuccessHandler:(void (^)())successHandler
              andFailureHandler:(void (^)(NSError *))failureHandler;
- (void)storeBlobForDeletionWithHash:(NSString *)blobHash
                           andHolder:(NSString *)blobHolder;
- (void)deleteStoredBlobs;
- (void)cancelOngoingRequests;
@end
