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
- (void)_deleteValueWithKey:(NSString *)key withOptions:(NSDictionary *)options;
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
    shared.options =
        @{@"keychainAccessible" : @(EXSecureStoreAccessibleAfterFirstUnlock)};
  });
  return shared;
}

- (void)set:(NSString *)key value:(NSString *)value {
  if ([self secureStore] == nil) {
    [NSException raise:@"secure store error"
                format:@"secure store has not been initialized"];
  }
  NSError *error;
  [[self secureStore] _setValue:value
                        withKey:key
                    withOptions:[self options]
                          error:&error];
  if (error != nil) {
    [NSException raise:@"secure store error"
                format:@"error occured when setting data"];
  }
}

- (NSString *)get:(NSString *)key {
  if ([self secureStore] == nil) {
    [NSException raise:@"secure store error"
                format:@"secure store has not been initialized"];
  }
  NSError *error;
  return [[self secureStore] _getValueWithKey:key
                                  withOptions:[self options]
                                        error:&error];
}

- (void)migrateOptionsForKey:(NSString *)key withVersion:(NSString *)version {
  NSString *secureStoreKeyVersionID = [key stringByAppendingString:@".version"];
  NSString *failureProtectionCopyKey = [key stringByAppendingString:@".copy"];

  NSString *secureStoreKeyVersion = [self get:secureStoreKeyVersionID];
  if (secureStoreKeyVersion &&
      [secureStoreKeyVersion isEqualToString:version]) {
    return;
  }

  NSString *value = [self get:key];
  NSString *valueCopy = [self get:failureProtectionCopyKey];

  if (value) {
    [self set:failureProtectionCopyKey value:value];
    [[self secureStore] _deleteValueWithKey:key withOptions:[self options]];
  } else if (valueCopy) {
    value = valueCopy;
  } else {
    [self set:secureStoreKeyVersionID value:version];
    return;
  }

  [self set:key value:value];
  [self set:secureStoreKeyVersionID value:version];
  [[self secureStore] _deleteValueWithKey:failureProtectionCopyKey
                              withOptions:[self options]];
}

@end
