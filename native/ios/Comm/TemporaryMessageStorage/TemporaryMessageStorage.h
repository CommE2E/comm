#pragma once

#import <Foundation/Foundation.h>

@interface TemporaryMessageStorage : NSObject
@property(readonly) NSURL *directoryURL;
@property(readonly) NSString *directoryPath;

- (instancetype)initAtDirectory:(NSString *)directoryName;
- (void)writeMessage:(NSString *)message;
- (NSArray<NSString *> *)readAndClearMessages;
@end
