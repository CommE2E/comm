#import "CommSecureStoreIOSWrapper.h"

#import "CommSecureStoreIOSWrapper.h"

@interface CommSecureStoreIOSWrapper ()
@property(nonatomic, assign) EXSecureStore *secureStore;
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
  });
  return shared;
}

- (void)init:(EXSecureStore *)secureStore {
  _secureStore = secureStore;
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

@end
