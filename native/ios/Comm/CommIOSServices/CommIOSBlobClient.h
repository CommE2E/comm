#import <Foundation/Foundation.h>

@interface CommIOSBlobClient : NSObject
+ (id)sharedInstance;
- (NSData *)getBlobSync:(NSString *)blobHash orSetError:(NSError **)error;
@end
