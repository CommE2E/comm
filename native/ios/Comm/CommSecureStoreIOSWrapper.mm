#import "CommSecureStoreIOSWrapper.h"

#import "CommSecureStoreIOSWrapper.h"
#import <ExpoModulesCore/EXModuleRegistryProvider.h>

@interface CommSecureStoreIOSWrapper ()
@property(nonatomic, strong) EXSecureStore *secureStore;
@property(nonatomic, strong) NSDictionary *options;
@end

@interface EXSecureStore (CommEXSecureStore)
- (BOOL)_setValue:(NSString *)value
          withKey:(NSString *)key
      withOptions:(NSDictionary *)options
            error:(NSError **)error;
- (NSString *)_getValueWithKey:(NSString *)key
                   withOptions:(NSDictionary *)options
                         error:(NSError **)error;
@end

@implementation CommSecureStoreIOSWrapper

#pragma mark Singleton Methods

+ (id)sharedInstance {
  static CommSecureStoreIOSWrapper *shared = nil;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    shared = [[self alloc] init];
    EXModuleRegistryProvider *moduleRegistryProvider =
        [[EXModuleRegistryProvider alloc] init];
    EXSecureStore *secureStore =
        (EXSecureStore *)[[moduleRegistryProvider moduleRegistry]
            getExportedModuleOfClass:EXSecureStore.class];
    shared.secureStore = secureStore;
  });
  return shared;
}

- (void)set:(NSString *)key
          value:(NSString *)value
    withOptions:(NSDictionary *)options {
  if ([self secureStore] == nil) {
    [NSException raise:@"secure store error"
                format:@"secure store has not been initialized"];
  }
  NSError *error;
  [[self secureStore] _setValue:value
                        withKey:key
                    withOptions:options
                          error:&error];
  if (error != nil) {
    [NSException raise:@"secure store error"
                format:@"error occured when setting data"];
  }
}

- (void)set:(NSString *)key value:(NSString *)value {
  [self set:key
            value:value
      withOptions:@{
        @"keychainAccessible" : @(EXSecureStoreAccessibleAfterFirstUnlock)
      }];
}

- (NSString *)get:(NSString *)key withOptions:(NSDictionary *)options {
  if ([self secureStore] == nil) {
    [NSException raise:@"secure store error"
                format:@"secure store has not been initialized"];
  }
  NSError *error;
  return [[self secureStore] _getValueWithKey:key
                                  withOptions:options
                                        error:&error];
}

- (NSString *)get:(NSString *)key {
  return [self get:key
       withOptions:@{
         @"keychainAccessible" : @(EXSecureStoreAccessibleAfterFirstUnlock)
       }];
}

@end
