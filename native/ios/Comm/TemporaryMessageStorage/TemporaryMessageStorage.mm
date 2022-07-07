#import "TemporaryMessageStorage.h"
#import "EncryptedFileUtils.h"
#import "Logger.h"
#import "NonBlockingLock.h"
#import <string>

@interface TemporaryMessageStorage ()
- (NSString *)_createNewStorage;
- (NSString *)_getLockName:(NSString *)fileName;
- (NSString *)_getPath:(NSString *)fileName;
@end

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

- (NSString *)_createNewStorage {
  int64_t timestamp = (int64_t)[NSDate date].timeIntervalSince1970;
  NSString *newStorageName = [NSString stringWithFormat:@"msg_%lld", timestamp];
  NSString *newStoragePath =
      [self.directoryURL URLByAppendingPathComponent:newStorageName].path;
  const char *newStoragePathCstr =
      [newStoragePath cStringUsingEncoding:NSUTF8StringEncoding];
  FILE *newStorage = fopen(newStoragePathCstr, "a");
  if (!newStorage) {
    return nil;
  }
  fclose(newStorage);
  return newStorageName;
}

- (NSString *)_getLockName:(NSString *)fileName {
  return [NSString stringWithFormat:@"group.app.comm/%@", fileName];
}

- (NSString *)_getPath:(NSString *)fileName {
  if (!fileName) {
    return nil;
  }
  return [self.directoryURL URLByAppendingPathComponent:fileName].path;
}

@end
