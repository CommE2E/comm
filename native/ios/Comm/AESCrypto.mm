#import "AESCrypto.h"
#import "AESCryptoModuleObjCCompat.h"
#import <Foundation/Foundation.h>

namespace comm {

template <typename T> void AESCrypto<T>::generateKey(T buffer) {
  NSError *keyGenerationError = nil;
  [AESCryptoModuleObjCCompat generateKey:buffer.data()
                       destinationLength:buffer.size()
                               withError:&keyGenerationError];
  if (keyGenerationError) {
    throw std::runtime_error(
        [[keyGenerationError localizedDescription] UTF8String]);
  }
}

template <typename T>
void AESCrypto<T>::encrypt(T key, T plaintext, T sealedData) {
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
    throw std::runtime_error([[encryptError localizedDescription] UTF8String]);
  }
}

template <typename T>
void AESCrypto<T>::decrypt(T key, T sealedData, T plaintext) {
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
    throw std::runtime_error([[decryptError localizedDescription] UTF8String]);
  }
}

template class AESCrypto<rust::Slice<uint8_t>>;
template class AESCrypto<std::vector<std::uint8_t> &>;

} // namespace comm
