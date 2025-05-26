#import "DBInit.h"
#import "CommConstants.h"
#import "CommCoreModule.h"
#import "CommIOSNotifications.h"
#import "CommIOSServicesClient.h"
#import "CommMMKV.h"
#import "CommRustModule.h"
#import "CommUtilsModule.h"
#import "GlobalDBSingleton.h"
#import "Logger.h"
#import "MessageOperationsUtilities.h"
#import "TemporaryMessageStorage.h"
#import "ThreadOperations.h"
#import "Tools.h"
#import <cstdio>
#import <stdexcept>
#import <string>

NSString *const setUnreadStatusKey = @"setUnreadStatus";
NSString *const threadIDKey = @"threadID";

@implementation DBInit

+ (void)attemptDatabaseInitialization {
  std::string sqliteFilePath =
      std::string([[Tools getSQLiteFilePath] UTF8String]);
  // Previous Comm versions used app group location for SQLite
  // database, so that NotificationService was able to acces it directly.
  // Unfortunately it caused errores related to system locks. The code
  // below re-migrates SQLite from app group to app specific location
  // on devices where previous Comm version was installed.
  NSString *appGroupSQLiteFilePath = [Tools getAppGroupSQLiteFilePath];
  if ([NSFileManager.defaultManager fileExistsAtPath:appGroupSQLiteFilePath] &&
      std::rename(
          std::string([appGroupSQLiteFilePath UTF8String]).c_str(),
          sqliteFilePath.c_str())) {
    throw std::runtime_error(
        "Failed to move SQLite database from app group to default location");
  }
  comm::GlobalDBSingleton::instance.scheduleOrRun([&sqliteFilePath]() {
    comm::DatabaseManager::initializeQueryExecutor(sqliteFilePath);
  });
}

+ (void)moveMessagesToDatabase:(BOOL)sendBackgroundMessagesInfosToJS {
  TemporaryMessageStorage *temporaryStorage =
      [[TemporaryMessageStorage alloc] init];
  NSArray<NSString *> *messages = [temporaryStorage readAndClearMessages];

  if (sendBackgroundMessagesInfosToJS && messages && messages.count) {
    [CommIOSNotifications
        didReceiveBackgroundMessageInfos:@{@"messageInfosArray" : messages}];
  }

  for (NSString *message in messages) {
    std::string messageInfos = std::string([message UTF8String]);
    comm::GlobalDBSingleton::instance.scheduleOrRun([messageInfos]() mutable {
      comm::MessageOperationsUtilities::storeMessageInfos(messageInfos);
    });
  }

  TemporaryMessageStorage *temporaryRescindsStorage =
      [[TemporaryMessageStorage alloc] initForRescinds];
  NSArray<NSString *> *rescindMessages =
      [temporaryRescindsStorage readAndClearMessages];
  for (NSString *rescindMessage in rescindMessages) {
    NSData *binaryRescindMessage =
        [rescindMessage dataUsingEncoding:NSUTF8StringEncoding];

    NSError *jsonError = nil;
    NSDictionary *rescindPayload =
        [NSJSONSerialization JSONObjectWithData:binaryRescindMessage
                                        options:0
                                          error:&jsonError];
    if (jsonError) {
      comm::Logger::log(
          "Failed to deserialize persisted rescind payload. Details: " +
          std::string([jsonError.localizedDescription UTF8String]));
      continue;
    }

    if (!(rescindPayload[setUnreadStatusKey] && rescindPayload[threadIDKey])) {
      continue;
    }

    std::string threadID =
        std::string([rescindPayload[threadIDKey] UTF8String]);
    comm::GlobalDBSingleton::instance.scheduleOrRun([threadID]() mutable {
      comm::ThreadOperations::updateSQLiteUnreadStatus(threadID, false);
    });
  }
}

+ (void)initMMKV {
  comm::CommMMKV::initialize();
}

@end
