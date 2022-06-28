#import <fcntl.h>
#import <semaphore.h>

#import <Foundation/Foundation.h>

@interface NonBlockingLock : NSObject
@property(readonly) const char *lockName;
@property(readonly, atomic) sem_t *lockHandle;

- (instancetype)initWithName:(NSString *)lockName;
- (BOOL)tryAcquireLock:(NSError **)err;
- (void)releaseLock:(NSError **)err;
- (void)destroyLock:(NSError **)err;
@end
