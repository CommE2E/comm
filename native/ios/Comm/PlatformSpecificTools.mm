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

std::string PlatformSpecificTools::getBackupFilePath(
    std::string backupID,
    bool isAttachments) {

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
        "Failed to resolve backup path - could not find documentsUrl");
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

  NSString *backupIDObjC = [NSString stringWithCString:backupID.c_str()
                                              encoding:NSUTF8StringEncoding];
  if (isAttachments) {
    return [[backupDir
                URLByAppendingPathComponent:
                    [@"backup-id-attachments-"
                        stringByAppendingString:backupIDObjC]].path UTF8String];
  }
  return [[backupDir
              URLByAppendingPathComponent:
                  [@"backup-id-"
                      stringByAppendingString:backupIDObjC]].path UTF8String];
}

void PlatformSpecificTools::removeBackupDirectory() {
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
        "Failed to resolve backup path - could not find documentsUrl");
  }

  NSURL *backupDir = [documentsUrl URLByAppendingPathComponent:@"backup"];
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
