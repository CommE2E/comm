#pragma once

#import <Foundation/Foundation.h>

@interface NSEBlobServiceClient : NSObject
+ (id)sharedInstance;
- (void)getAndConsumeSync:(NSString *)blobHash
      withSuccessConsumer:(void (^)(NSData *))successConsumer;
@end
