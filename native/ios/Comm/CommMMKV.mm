#import "CommMMKV.h"
#import "../../cpp/CommonCpp/CryptoTools/Tools.h"
#import "CommSecureStore.h"
#import "Logger.h"
#import "Tools.h"

#import <Foundation/Foundation.h>
#import <MMKV.h>

namespace comm {

const int commMMKVEncryptionKeySize = 16;
const std::string secureStoreMMKVEncryptionKeyID = "comm.MMKVEncryptionKey";
const NSString *commMMKVId = @"comm.MMKV";

static NSString *mmkvEncryptionKey;

MMKV *getMMKVInstance(NSString *mmkvID, NSString *encryptionKey) {
  MMKV *mmkv =
      [MMKV mmkvWithID:mmkvID
              cryptKey:[encryptionKey dataUsingEncoding:NSUTF8StringEncoding]
                  mode:MMKVMultiProcess];
  if (!mmkv) {
    throw std::runtime_error("Failed to instantiate MMKV object.");
  }
  return mmkv;
}

void assignEncryptionKey() {
  std::string encryptionKey =
      crypto::Tools::generateRandomString(commMMKVEncryptionKeySize);
  CommSecureStore::set(secureStoreMMKVEncryptionKeyID, encryptionKey);
  mmkvEncryptionKey = [NSString stringWithCString:encryptionKey.c_str()
                                         encoding:NSUTF8StringEncoding];
}

void CommMMKV::initialize() {
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    auto maybeEncryptionKey =
        CommSecureStore::get(secureStoreMMKVEncryptionKeyID);

    bool isRunningInAppExtension =
        [[[NSBundle mainBundle] bundlePath] hasSuffix:@".appex"];

    if (maybeEncryptionKey.hasValue()) {
      mmkvEncryptionKey =
          [NSString stringWithCString:maybeEncryptionKey.value().c_str()
                             encoding:NSUTF8StringEncoding];
    } else if (!isRunningInAppExtension) {
      assignEncryptionKey();
    } else {
      throw std::runtime_error("NSE can't initialize MMKV encryption key.");
    }

    [MMKV initializeMMKV:nil
                groupDir:[Tools getAppGroupDirectoryPath]
                logLevel:MMKVLogNone];
    getMMKVInstance(commMMKVId.copy, mmkvEncryptionKey);
  });
}

void CommMMKV::clearSensitiveData() {
  CommMMKV::initialize();

  @synchronized(mmkvEncryptionKey) {
    BOOL storageRemoved = [MMKV removeStorage:commMMKVId.copy
                                         mode:MMKVMultiProcess];
    if (!storageRemoved) {
      throw std::runtime_error("Failed to remove mmkv storage.");
    }

    assignEncryptionKey();
    [MMKV initializeMMKV:nil
                groupDir:[Tools getAppGroupDirectoryPath]
                logLevel:MMKVLogNone];
    getMMKVInstance(commMMKVId.copy, mmkvEncryptionKey);
  }
}

bool CommMMKV::setString(std::string key, std::string value) {
  CommMMKV::initialize();
  MMKV *mmkv = getMMKVInstance(commMMKVId.copy, mmkvEncryptionKey);

  BOOL result =
      [mmkv setString:[NSString stringWithCString:value.c_str()
                                         encoding:NSUTF8StringEncoding]
               forKey:[NSString stringWithCString:key.c_str()
                                         encoding:NSUTF8StringEncoding]];
  if (!result) {
    Logger::log("Attempt to write in background or failure during write.");
  }
  return result;
}

std::optional<std::string> CommMMKV::getString(std::string key) {
  CommMMKV::initialize();
  MMKV *mmkv = getMMKVInstance(commMMKVId.copy, mmkvEncryptionKey);

  NSString *value =
      [mmkv getStringForKey:[NSString stringWithCString:key.c_str()
                                               encoding:NSUTF8StringEncoding]];
  if (!value) {
    return std::nullopt;
  }
  return std::string([value UTF8String]);
}

} // namespace comm
