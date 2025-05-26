#import <Foundation/Foundation.h>

typedef NS_ENUM(NSInteger, SecureStoreAccessible) {
  SecureStoreAccessibleAfterFirstUnlock = 0,
  SecureStoreAccessibleAfterFirstUnlockThisDeviceOnly = 1,
  SecureStoreAccessibleAlways = 2,
  SecureStoreAccessibleWhenPasscodeSetThisDeviceOnly = 3,
  SecureStoreAccessibleAlwaysThisDeviceOnly = 4,
  SecureStoreAccessibleWhenUnlocked = 5,
  SecureStoreAccessibleWhenUnlockedThisDeviceOnly = 6,
};

@interface SecureStoreOptions : NSObject
@property(nonatomic, copy) NSString *_Nullable authenticationPrompt;
@property(nonatomic) SecureStoreAccessible keychainAccessible;
@property(nonatomic, copy) NSString *_Nullable keychainService;
@property(nonatomic) BOOL requireAuthentication;
@property(nonatomic, copy) NSString *_Nullable accessGroup;
- (nonnull instancetype)init;
@end

@interface SecureStoreModule : NSObject
- (NSString *_Nullable)getValueWithKey:(NSString *_Nonnull)key
                               options:(SecureStoreOptions *_Nonnull)options;
- (BOOL)setValueWithKeyWithValue:(NSString *_Nonnull)value
                             key:(NSString *_Nonnull)key
                         options:(SecureStoreOptions *_Nonnull)options;
- (nonnull instancetype)init;
@end
