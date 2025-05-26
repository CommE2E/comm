#import "CommSecureStoreIOSWrapper.h"

#import "CommSecureStore/SecureStoreModule.h"

@interface CommSecureStoreIOSWrapper ()
@property(nonatomic, strong) SecureStoreModule *secureStore;
@property(nonatomic, strong) NSDictionary *options;
@end

@implementation CommSecureStoreIOSWrapper

#pragma mark Singleton Methods

+ (id)sharedInstance {
  static CommSecureStoreIOSWrapper *shared = nil;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    shared = [[self alloc] init];
    shared.secureStore = [SecureStoreModule new];
  });
  return shared;
}

- (void)set:(NSString *)key
          value:(NSString *)value
    withOptions:(SecureStoreOptions *)options {
  if ([self secureStore] == nil) {
    [NSException raise:@"secure store error"
                format:@"secure store has not been initialized"];
  }
  NSError *error;
  [[self secureStore] setValueWithKeyWithValue:value key:key options:options];
  if (error != nil) {
    [NSException raise:@"secure store error"
                format:@"error occured when setting data"];
  }
}

- (void)set:(NSString *)key value:(NSString *)value {
  SecureStoreOptions *storeOptions = [SecureStoreOptions new];
  storeOptions.keychainAccessible = SecureStoreAccessibleAfterFirstUnlock;
  [self set:key value:value withOptions:storeOptions];
}

- (NSString *)get:(NSString *)key withOptions:(SecureStoreOptions *)options {
  if ([self secureStore] == nil) {
    [NSException raise:@"secure store error"
                format:@"secure store has not been initialized"];
  }
  NSError *error;
  return [[self secureStore] getValueWithKey:key options:options];
}

- (NSString *)get:(NSString *)key {
  SecureStoreOptions *storeOptions = [SecureStoreOptions new];
  storeOptions.keychainAccessible = SecureStoreAccessibleAfterFirstUnlock;
  return [self get:key withOptions:storeOptions];
}

@end
