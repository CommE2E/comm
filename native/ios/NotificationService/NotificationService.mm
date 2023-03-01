#import "NotificationService.h"
#import "Logger.h"
#import "TemporaryMessageStorage.h"

// The context for this constant can be found here:
// https://linear.app/comm/issue/ENG-3074#comment-bd2f5e28
int64_t const notificationRemovalDelay = (int64_t)(0.1 * NSEC_PER_SEC);

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
    [self removeNotificationWithIdentifier:self.bestAttemptContent
                                               .userInfo[@"notificationId"]];
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

- (void)removeNotificationWithIdentifier:(NSString *)identifier {
  dispatch_semaphore_t semaphore = dispatch_semaphore_create(0);

  void (^postRemovalCallback)() = ^() {
    dispatch_time_t timeToPostSemaphore =
        dispatch_time(DISPATCH_TIME_NOW, notificationRemovalDelay);
    dispatch_after(timeToPostSemaphore, dispatch_get_main_queue(), ^{
      dispatch_semaphore_signal(semaphore);
    });
  };

  [UNUserNotificationCenter.currentNotificationCenter
      getDeliveredNotificationsWithCompletionHandler:^(
          NSArray<UNNotification *> *_Nonnull notifications) {
        for (UNNotification *notif in notifications) {
          if ([identifier isEqual:notif.request.content.userInfo[@"id"]]) {
            [UNUserNotificationCenter.currentNotificationCenter
                removeDeliveredNotificationsWithIdentifiers:@[
                  notif.request.identifier
                ]];
          }
          postRemovalCallback();
        }
      }];

  dispatch_semaphore_wait(semaphore, DISPATCH_TIME_FOREVER);
}

- (BOOL)isRescind:(NSDictionary *)payload {
  return payload[@"backgroundNotifType"] &&
      [payload[@"backgroundNotifType"] isEqualToString:@"CLEAR"];
}

@end
