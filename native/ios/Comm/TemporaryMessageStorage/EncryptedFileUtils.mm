#import "EncryptedFileUtils.h"
#import "CommSecureStoreIOSWrapper.h"
#import "Logger.h"
#import <CommonCrypto/CommonCryptor.h>

@interface EncryptedFileUtils ()
+ (NSData *)_runCryptor:(NSData *)binary
              operation:(CCOperation)operation
                  error:(NSError **)error;
+ (NSData *)_encryptData:(NSString *)data error:(NSError **)error;
+ (NSString *)_decryptData:(NSString *)data error:(NSError **)error;
@end

@implementation EncryptedFileUtils
+ (void)writeData:(NSString *)data
     toFileAtPath:(NSString *)path
            error:(NSError **)err {
  NSData *binary = [EncryptedFileUtils _encryptData:data error:err];
  if (!binary) {
    return;
  }
  [binary writeToFile:path atomically:YES];
}

+ (void)appendData:(NSString *)data
      toFileAtPath:(NSString *)path
             error:(NSError **)err {
  NSData *binary = [EncryptedFileUtils _encryptData:data error:err];
  if (!binary) {
    return;
  }
  NSFileHandle *fileHandle = [NSFileHandle fileHandleForWritingAtPath:path];
  @try {
    [fileHandle seekToEndOfFile];
    [fileHandle writeData:[encryptedDataSeparator
                              dataUsingEncoding:NSUTF8StringEncoding]];
    [fileHandle writeData:binary];
    [fileHandle closeFile];
  } @catch (NSException *ex) {
    *err = [NSError errorWithDomain:@"app.comm"
                               code:NSFileWriteUnknownError
                           userInfo:@{
                             NSLocalizedDescriptionKey : ex.reason,
                           }];
  }
}

+ (NSArray<NSString *> *)readFromFileAtPath:(NSString *)path
                                      error:(NSError **)err {
  NSString *fileContent =
      [NSString stringWithContentsOfFile:path
                                encoding:NSUTF8StringEncoding
                                   error:err];
  if (!fileContent) {
    return nil;
  }
  NSMutableArray<NSString *> *decryptedDataItems =
      [[NSMutableArray alloc] init];
  NSMutableArray<NSString *> *encryptedDataItems = [[fileContent
      componentsSeparatedByString:encryptedDataSeparator] mutableCopy];
  [encryptedDataItems removeObject:@""];
  for (NSString *encryptedDataItem in encryptedDataItems) {
    NSString *decryptedDataItem =
        [EncryptedFileUtils _decryptData:encryptedDataItem error:nil];
    if (decryptedDataItem) {
      [decryptedDataItems addObject:decryptedDataItem];
    }
  }
  return decryptedDataItems;
}

+ (NSData *)_encryptData:(NSString *)data error:(NSError **)error {
  NSData *encryptedData = [EncryptedFileUtils
      _runCryptor:[data dataUsingEncoding:NSUTF8StringEncoding]
        operation:kCCEncrypt
            error:error];
  if (!encryptedData) {
    return nil;
  }
  return [encryptedData base64EncodedDataWithOptions:0];
}

+ (NSString *)_decryptData:(NSString *)data error:(NSError **)error {
  NSData *base64DecodedData = [[NSData alloc] initWithBase64EncodedString:data
                                                                  options:0];
  NSString *decryptedData = [[NSString alloc]
      initWithData:[EncryptedFileUtils _runCryptor:base64DecodedData
                                         operation:kCCDecrypt
                                             error:error]
          encoding:NSUTF8StringEncoding];
  if (!decryptedData) {
    return nil;
  }
  return decryptedData;
}

+ (NSData *)_runCryptor:(NSData *)binary
              operation:(CCOperation)operation
                  error:(NSError **)err {
  NSString *keyString =
      [[CommSecureStoreIOSWrapper sharedInstance] get:@"comm.encryptionKey"];
  if (!keyString) {
    *err = [NSError
        errorWithDomain:@"app.comm"
                   code:NSCoderValueNotFoundError
               userInfo:@{
                 NSLocalizedDescriptionKey : @"Encryption key not created yet"
               }];
    return nil;
  }

  NSUInteger AES256KeyByteCount = 32;
  NSData *key = [[keyString substringToIndex:AES256KeyByteCount]
      dataUsingEncoding:NSUTF8StringEncoding];
  NSMutableData *resultBinary =
      [NSMutableData dataWithLength:binary.length + kCCBlockSizeAES128];

  size_t processedBytes = 0;
  CCCryptorStatus ccStatus = CCCrypt(
      operation,
      kCCAlgorithmAES,
      kCCOptionPKCS7Padding,
      key.bytes,
      key.length,
      nil,
      binary.bytes,
      binary.length,
      resultBinary.mutableBytes,
      resultBinary.length,
      &processedBytes);

  resultBinary.length = processedBytes;
  if (ccStatus != kCCSuccess) {
    *err = [NSError
        errorWithDomain:@"app.comm"
                   code:ccStatus
               userInfo:@{
                 NSLocalizedDescriptionKey : @"Cryptographic operation failed"
               }];
    return nil;
  }
  return resultBinary;
}

@end
