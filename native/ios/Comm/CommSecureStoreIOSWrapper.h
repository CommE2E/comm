#pragma once

#import <EXSecureStore/EXSecureStore.h>

#import <Foundation/Foundation.h>

@interface CommSecureStoreIOSWrapper : NSObject
+ (id)sharedInstance;

- (void)set:(NSString *)key value:(NSString *)value;
- (NSString *)get:(NSString *)key;
- (void)migrateOptionsForKey:(NSString *)key withVersion:(NSString *)version;
@end
