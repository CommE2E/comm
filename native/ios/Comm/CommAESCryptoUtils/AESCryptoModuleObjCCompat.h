#import <Foundation/Foundation.h>

@interface AESCryptoModuleObjCCompat : NSObject
- (BOOL)generateKey:(NSMutableData *_Nonnull)destination
          withError:(NSError *_Nullable *_Nullable)error;
- (NSInteger)encryptedLength:(NSData *_Nonnull)plaintext;
- (BOOL)encryptWithKey:(NSData *_Nonnull)rawKey
             plaintext:(NSData *_Nonnull)plaintext
           destination:(NSMutableData *_Nonnull)destination
             withError:(NSError *_Nullable *_Nullable)error;
- (NSInteger)decryptedLength:(NSData *_Nonnull)sealedData;
- (BOOL)decryptWithKey:(NSData *_Nonnull)rawKey
            sealedData:(NSData *_Nonnull)sealedData
           destination:(NSMutableData *_Nonnull)destination
             withError:(NSError *_Nullable *_Nullable)error;
- (nonnull instancetype)init;
@end
