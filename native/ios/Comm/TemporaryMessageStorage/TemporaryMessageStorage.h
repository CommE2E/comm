#pragma once

#import <Foundation/Foundation.h>

@interface TemporaryMessageStorage : NSObject
@property(readonly) NSURL *directoryURL;
@property(readonly) NSString *directoryPath;
@property(readonly) NSString *filePrefix;

- (instancetype)initForRescinds;
- (void)writeMessage:(NSString *)message;
- (NSArray<NSString *> *)readAndClearMessages;
@end
