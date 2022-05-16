#import "NotificationService.h"
#import "../Comm/Tools.h"
#import "Logger.h"
#import "MessageOperationsUtilities.h"

@interface NotificationService ()

@property(nonatomic, strong) void (^contentHandler)
    (UNNotificationContent *contentToDeliver);
@property(nonatomic, strong) UNMutableNotificationContent *bestAttemptContent;

@end

@implementation NotificationService

- (void)didReceiveNotificationRequest:(UNNotificationRequest *)request
                   withContentHandler:
                       (void (^)(UNNotificationContent *_Nonnull))
                           contentHandler {
  self.contentHandler = contentHandler;
  self.bestAttemptContent = [request.content mutableCopy];

  // TODO modify self.bestAttemptContent here
  NSString *rawMessageInfosString =
      self.bestAttemptContent.userInfo[@"messageInfos"];
  NSString *sqliteFilePath = [Tools getSQLiteFilePath];

  if (rawMessageInfosString &&
      [NSFileManager.defaultManager fileExistsAtPath:sqliteFilePath]) {
    std::string sqliteFilePathStdStr = [sqliteFilePath UTF8String];
    std::string rawMessageInfosStdStr = [rawMessageInfosString UTF8String];
    comm::SQLiteQueryExecutor::initialize(sqliteFilePathStdStr);
    comm::MessageOperationsUtilities::storeNotification(rawMessageInfosStdStr);
  } else if (rawMessageInfosString) {
    comm::Logger::log("Database not existing yet. Skipping notification");
  }

  self.contentHandler(self.bestAttemptContent);
}

- (void)serviceExtensionTimeWillExpire {
  // Called just before the extension will be terminated by the system.
  // Use this as an opportunity to deliver your "best attempt" at modified
  // content, otherwise the original push payload will be used.
  self.contentHandler(self.bestAttemptContent);
}

@end
