#import "NonBlockingLock.h"
#import <string>

@implementation NonBlockingLock
- (instancetype)initWithName:(NSString *)lockName {
  self = [super init];
  if (self) {
    _lockName = [lockName cStringUsingEncoding:NSUTF8StringEncoding];
    _lockHandle = nil;
  }
  return self;
}

- (BOOL)tryAcquireLock:(NSError **)err {
  if (_lockHandle) {
    *err = [NSError errorWithDomain:@"app.comm"
                               code:EBUSY
                           userInfo:@{
                             NSLocalizedDescriptionKey :
                                 @"Attempt to acquire already held lock."
                           }];
    return NO;
  }
  sem_t *lock = sem_open(self.lockName, O_CREAT, 0644, 1);
  if (lock == SEM_FAILED) {
    *err = [NSError errorWithDomain:@"app.comm"
                               code:errno
                           userInfo:@{
                             NSLocalizedDescriptionKey : [NSString
                                 stringWithCString:strerror(errno)
                                          encoding:NSUTF8StringEncoding]
                           }];
    sem_close(lock);
    return NO;
  }
  if (sem_trywait(lock)) {
    *err = [NSError errorWithDomain:@"app.comm"
                               code:errno
                           userInfo:@{
                             NSLocalizedDescriptionKey : [NSString
                                 stringWithCString:strerror(errno)
                                          encoding:NSUTF8StringEncoding]
                           }];
    sem_close(lock);
    return NO;
  }
  _lockHandle = lock;
  return YES;
}

- (void)releaseLock:(NSError **)err {
  if (!self.lockHandle) {
    *err =
        [NSError errorWithDomain:@"app.comm"
                            code:ENODATA
                        userInfo:@{
                          NSLocalizedDescriptionKey :
                              @"Attempt to release lock that was not acquired."
                        }];
    return;
  }
  sem_post(_lockHandle);
  sem_close(_lockHandle);
  _lockHandle = nil;
}

- (void)destroyLock:(NSError **)err {
  if (sem_unlink(_lockName)) {
    *err = [NSError errorWithDomain:@"app.comm"
                               code:errno
                           userInfo:@{
                             NSLocalizedDescriptionKey : [NSString
                                 stringWithCString:strerror(errno)
                                          encoding:NSUTF8StringEncoding]
                           }];
  };
}
@end
