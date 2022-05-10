#pragma once

#import <UIKit/UIKit.h>

@interface Tools : NSObject
+ (NSString *)getAppSpecificSQLiteFilePath;
+ (NSString *)getSQLiteFilePath;
@end
