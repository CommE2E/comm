#import "Tools.h"
#import <Foundation/Foundation.h>
#import <stdexcept>

@interface Tools ()
+ (NSURL *)getAppGroupDirectoryURL;
@end

@implementation Tools

+ (NSString *)getSQLiteFilePath {
  NSError *err = nil;
  NSURL *documentsUrl =
      [NSFileManager.defaultManager URLForDirectory:NSDocumentDirectory
                                           inDomain:NSUserDomainMask
                                  appropriateForURL:nil
                                             create:false
                                              error:&err];

  if (err) {
    NSLog(@"Error: %@", err);
    throw std::runtime_error(
        "Failed to resolve database path - could not find documentsUrl");
  }

  return [documentsUrl URLByAppendingPathComponent:@"comm.sqlite"].path;
}

+ (NSURL *)getAppGroupDirectoryURL {
  NSURL *groupUrl = [NSFileManager.defaultManager
      containerURLForSecurityApplicationGroupIdentifier:@"group.app.comm"];
  if (groupUrl == nil) {
    throw std::runtime_error(
        "Failed to resolve app group path - could not find groupUrl");
  }
  return groupUrl;
}

+ (NSString *)getAppGroupDirectoryPath {
  NSURL *groupUrl = [Tools getAppGroupDirectoryURL];
  return groupUrl.path;
}

+ (NSString *)getAppGroupSQLiteFilePath {
  NSURL *groupUrl = [Tools getAppGroupDirectoryURL];
  return [groupUrl URLByAppendingPathComponent:@"comm.sqlite"].path;
}

@end
