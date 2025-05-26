#import <Foundation/Foundation.h>

@interface DBInit : NSObject

+ (void)attemptDatabaseInitialization;
+ (void)moveMessagesToDatabase:(BOOL)sendBackgroundMessagesInfosToJS;
+ (void)initMMKV;

@end
