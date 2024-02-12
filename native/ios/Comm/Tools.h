#pragma once

#import <UIKit/UIKit.h>

@interface Tools : NSObject
+ (NSString *)getSQLiteFilePath;
+ (NSString *)getAppGroupDirectoryPath;
+ (NSString *)getAppGroupSQLiteFilePath;
@end
