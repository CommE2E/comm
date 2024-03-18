#import <Foundation/Foundation.h>

@interface CommIOSBlobClient : NSObject
+ (id)sharedInstance;
- (void)getBlobSync:(NSString *)blobHash
    withSuccessHandler:(void (^)(NSData *))successHandler
     andFailureHandler:(void (^)(NSError *))failureHandler;
@end
