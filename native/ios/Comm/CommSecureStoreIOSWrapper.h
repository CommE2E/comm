#pragma once

#import <EXSecureStore/EXSecureStore.h>

#import <Foundation/Foundation.h>

@interface CommSecureStoreIOSWrapper : NSObject
+ (id)sharedInstance;

- (void)set:(NSString *)key value:(NSString *)value;
- (void)set:(NSString *)key
          value:(NSString *)value
    withOptions:(NSDictionary *)options;
- (NSString *)get:(NSString *)key;
- (NSString *)get:(NSString *)key withOptions:(NSDictionary *)options;
@end
