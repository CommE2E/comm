#import "TemporaryMessageStorage.h"
#import "EncryptedFileUtils.h"
#import "Logger.h"
#import "NonBlockingLock.h"
#import <string>

@implementation TemporaryMessageStorage

- (instancetype)init {
  self = [self initAtDirectory:@"TemporaryMessageStorage"];
  return self;
}

- (instancetype)initAtDirectory:(NSString *)directoryName {
  self = [super init];
  if (!self) {
    return self;
  }

  NSURL *groupURL = [NSFileManager.defaultManager
      containerURLForSecurityApplicationGroupIdentifier:@"group.app.comm"];
  NSURL *directoryURL = [groupURL URLByAppendingPathComponent:directoryName];
  NSString *directoryPath = directoryURL.path;
  NSError *err = nil;

  if (![NSFileManager.defaultManager fileExistsAtPath:directoryPath]) {
    [NSFileManager.defaultManager createDirectoryAtPath:directoryPath
                            withIntermediateDirectories:NO
                                             attributes:nil
                                                  error:&err];
  }
  if (err) {
    comm::Logger::log(
        "Failed to create directory at path: " +
        std::string([directoryPath UTF8String]) +
        ". Details: " + std::string([err.localizedDescription UTF8String]));
  }
  _directoryURL = directoryURL;
  _directoryPath = directoryPath;
  return self;
}

@end
