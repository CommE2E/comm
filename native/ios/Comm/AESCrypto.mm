#import "AESCrypto.h"
#import "AESCryptoModuleObjCCompat.h"
#import <Foundation/Foundation.h>

namespace comm {

std::string AESCrypto::generateKey(rust::Slice<uint8_t> buffer) {
  NSError *keyGenerationError = nil;
  [AESCryptoModuleObjCCompat generateKey:buffer.data()
                       destinationLength:buffer.size()
                               withError:&keyGenerationError];
  if (keyGenerationError) {
    return std::string([[keyGenerationError localizedDescription] UTF8String]);
  }
  return std::string();
}

std::string AESCrypto::encrypt(
    rust::Slice<uint8_t> key,
    rust::Slice<uint8_t> plaintext,
    rust::Slice<uint8_t> sealedData) {
  NSData *keyBuffer = [NSData dataWithBytesNoCopy:key.data()
                                           length:key.size()
                                     freeWhenDone:NO];
  NSData *plaintextBuffer = [NSData dataWithBytesNoCopy:plaintext.data()
                                                 length:plaintext.size()
                                           freeWhenDone:NO];
  NSError *encryptError = nil;
  [AESCryptoModuleObjCCompat encryptWithKey:keyBuffer
                                  plaintext:plaintextBuffer
                             destinationPtr:sealedData.data()
                          destinationLength:sealedData.size()
                                  withError:&encryptError];

  if (encryptError) {
    return std::string([[encryptError localizedDescription] UTF8String]);
  }
  return std::string();
}

std::string AESCrypto::decrypt(
    rust::Slice<uint8_t> key,
    rust::Slice<uint8_t> sealedData,
    rust::Slice<uint8_t> plaintext) {
  NSData *keyBuffer = [NSData dataWithBytesNoCopy:key.data()
                                           length:key.size()
                                     freeWhenDone:NO];
  NSData *sealedDataBuffer = [NSData dataWithBytesNoCopy:sealedData.data()
                                                  length:sealedData.size()
                                            freeWhenDone:NO];
  NSError *decryptError = nil;
  [AESCryptoModuleObjCCompat decryptWithKey:keyBuffer
                                 sealedData:sealedDataBuffer
                             destinationPtr:plaintext.data()
                          destinationLength:plaintext.size()
                                  withError:&decryptError];

  if (decryptError) {
    return std::string([[decryptError localizedDescription] UTF8String]);
  }
  return std::string();
}

} // namespace comm
