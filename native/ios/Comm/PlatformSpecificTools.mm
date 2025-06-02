#import "PlatformSpecificTools.h"
#import <Foundation/Foundation.h>
#import <string>

namespace comm {

void PlatformSpecificTools::generateSecureRandomBytes(
    crypto::OlmBuffer &buffer,
    size_t size) {
  uint8_t randomBytes[size];

  const int status = SecRandomCopyBytes(kSecRandomDefault, size, randomBytes);
  if (status == errSecSuccess) {
    buffer = crypto::OlmBuffer(randomBytes, randomBytes + size);
  } else {
    throw std::runtime_error(
        "SecRandomCopyBytes failed for some reason, error code: " +
        std::to_string(status));
  }
}

std::string PlatformSpecificTools::getDeviceOS() {
  return std::string{"ios"};
}

std::string PlatformSpecificTools::getNotificationsCryptoAccountPath() {
  NSURL *groupUrl = [NSFileManager.defaultManager
      containerURLForSecurityApplicationGroupIdentifier:@"group.app.comm"];
  if (groupUrl == nil) {
    throw std::runtime_error(
        "Failed to resolve notifications crypto account path - could not find "
        "groupUrl");
  }
  return std::string(
      [[groupUrl
           URLByAppendingPathComponent:@"comm_notifications_crypto_account"]
              .path UTF8String]);
}

NSURL *getBackupDirAsURL() {
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
        "Failed to resolve backup path - could not find documentsUrl. "
        "Details: " +
        std::string([err.localizedDescription UTF8String]));
  }

  NSURL *backupDir = [documentsUrl URLByAppendingPathComponent:@"backup"];
  NSError *backupDirCreateError = nil;
  if (![NSFileManager.defaultManager fileExistsAtPath:backupDir.path]) {
    [NSFileManager.defaultManager createDirectoryAtURL:backupDir
                           withIntermediateDirectories:YES
                                            attributes:nil
                                                 error:&backupDirCreateError];
  }
  if (backupDirCreateError) {
    throw std::runtime_error(
        "Failed to create backup directory. Details: " +
        std::string([backupDirCreateError.localizedDescription UTF8String]));
  }
  return backupDir;
}

std::string getBackupFilePathInternal(std::string backupID, NSString *suffix) {
  NSURL *backupDir = getBackupDirAsURL();
  NSString *backupIDObjC = [NSString stringWithCString:backupID.c_str()
                                              encoding:NSUTF8StringEncoding];
  NSString *filename;
  if (suffix) {
    filename =
        [@[ @"backup", backupIDObjC, suffix ] componentsJoinedByString:@"-"];
  } else {
    filename = [@[ @"backup", backupIDObjC ] componentsJoinedByString:@"-"];
  }

  return [[backupDir URLByAppendingPathComponent:filename].path UTF8String];
}

std::string PlatformSpecificTools::getBackupDirectoryPath() {
  return [getBackupDirAsURL().path UTF8String];
}

std::string PlatformSpecificTools::getBackupFilePath(
    std::string backupID,
    bool isAttachments,
    bool isVersion) {

  if (isAttachments) {
    return getBackupFilePathInternal(backupID, @"attachments");
  }
  if (isVersion) {
    return getBackupFilePathInternal(backupID, @"dbVersion");
  }
  return getBackupFilePathInternal(backupID, nil);
}

std::string PlatformSpecificTools::getBackupLogFilePath(
    std::string backupID,
    std::string logID,
    bool isAttachments) {

  NSString *logIDObjC = [NSString stringWithCString:logID.c_str()
                                           encoding:NSUTF8StringEncoding];
  NSString *suffix;
  if (isAttachments) {
    suffix =
        [@[ @"log", logIDObjC, @"attachments" ] componentsJoinedByString:@"-"];
  } else {
    suffix = [@[ @"log", logIDObjC ] componentsJoinedByString:@"-"];
  }
  return getBackupFilePathInternal(backupID, suffix);
}

std::string
PlatformSpecificTools::getBackupUserKeysFilePath(std::string backupID) {
  return getBackupFilePathInternal(backupID, @"userkeys");
}

std::string
PlatformSpecificTools::getSIWEBackupMessagePath(std::string backupID) {
  return getBackupFilePathInternal(backupID, @"siweBackupMsg");
}

void PlatformSpecificTools::removeBackupDirectory() {
  NSURL *backupDir = getBackupDirAsURL();
  if (![NSFileManager.defaultManager fileExistsAtPath:backupDir.path]) {
    return;
  }

  NSError *backupDirRemovalError = nil;
  [NSFileManager.defaultManager removeItemAtURL:backupDir
                                          error:&backupDirRemovalError];

  if (backupDirRemovalError) {
    throw std::runtime_error(
        "Failed to remove backup directory. Details: " +
        std::string([backupDirRemovalError.localizedDescription UTF8String]));
  }
}

}; // namespace comm
