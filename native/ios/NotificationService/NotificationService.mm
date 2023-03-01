#import "NotificationService.h"
#import "Logger.h"
#import "TemporaryMessageStorage.h"

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

  if ([self isRescind:self.bestAttemptContent.userInfo]) {
    self.contentHandler([[UNNotificationContent alloc] init]);
    return;
  }

  NSString *message = self.bestAttemptContent.userInfo[@"messageInfos"];
  if (message) {
    TemporaryMessageStorage *temporaryStorage =
        [[TemporaryMessageStorage alloc] init];
    [temporaryStorage writeMessage:message];
  }
  // TODO modify self.bestAttemptContent here

  self.contentHandler(self.bestAttemptContent);
}

- (void)serviceExtensionTimeWillExpire {
  // Called just before the extension will be terminated by the system.
  // Use this as an opportunity to deliver your "best attempt" at modified
  // content, otherwise the original push payload will be used.
  if ([self isRescind:self.bestAttemptContent.userInfo]) {
    // If we get to this place it means we were unable to
    // remove relevant notification from notification center in
    // in time given to NSE to process notification.
    // It is an extremely unlikely to happen.
    comm::Logger::log("NSE: Exceeded time limit to rescind a notification.");
    self.contentHandler([[UNNotificationContent alloc] init]);
  }
  self.contentHandler(self.bestAttemptContent);
}

- (BOOL)isRescind:(NSDictionary *)payload {
  return payload[@"backgroundNotifType"] &&
      [payload[@"backgroundNotifType"] isEqualToString:@"CLEAR"];
}

@end
