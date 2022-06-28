#import <Foundation/Foundation.h>

NSString *const encryptedDataSeparator = @"\n";

@interface EncryptedFileUtils : NSObject
+ (void)writeData:(NSString *)data
     toFileAtPath:(NSString *)path
            error:(NSError **)err;
+ (void)appendData:(NSString *)data
      toFileAtPath:(NSString *)path
             error:(NSError **)err;
+ (NSArray<NSString *> *)readFromFileAtPath:(NSString *)path
                                      error:(NSError **)err;
@end
