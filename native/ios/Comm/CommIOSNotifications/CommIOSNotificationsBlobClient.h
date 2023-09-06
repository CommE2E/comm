#pragma once

#import <Foundation/Foundation.h>

@interface CommIOSNotificationsBlobClient : NSObject
+ (id)sharedInstance;
- (void)getAndConsumeSync:(NSString *)blobHash
      withSuccessConsumer:(void (^)(NSData *))successConsumer;
- (void)deleteBlobs:(NSArray<NSString *> *_Nonnull)blobsData
    withFailureHandler:(void (^_Nonnull)(NSString *_Nonnull))failureHandler;
- (void)cancelOnGoingRequests;
@end
