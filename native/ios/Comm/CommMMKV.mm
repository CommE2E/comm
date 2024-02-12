#import "CommMMKV.h"
#import "../../cpp/CommonCpp/CryptoTools/Tools.h"
#import "CommSecureStore.h"
#import "Logger.h"
#import "Tools.h"

#import <Foundation/Foundation.h>
#import <MMKV.h>

namespace comm {

const int mmkvEncryptionKeySize = 16;
const int mmkvIDsize = 8;

const std::string secureStoreMMKVEncryptionKeyID = "comm.mmkvEncryptionKey";
const std::string secureStoreMMKVIdentifierKeyID = "comm.mmkvID";

static NSString *mmkvEncryptionKey;
static NSString *mmkvIdentifier;

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

void assignInitializationData() {
  std::string encryptionKey =
      crypto::Tools::generateRandomString(mmkvEncryptionKeySize);
  std::string identifier = crypto::Tools::generateRandomString(mmkvIDsize);
  CommSecureStore::set(secureStoreMMKVEncryptionKeyID, encryptionKey);
  CommSecureStore::set(secureStoreMMKVIdentifierKeyID, identifier);
  mmkvEncryptionKey = [NSString stringWithCString:encryptionKey.c_str()
                                         encoding:NSUTF8StringEncoding];
  mmkvIdentifier = [NSString stringWithCString:identifier.c_str()
                                      encoding:NSUTF8StringEncoding];
}

void CommMMKV::initialize() {
  // This way of checking if we are running in app extension is
  // taken from MMKV implementation. See the code linked below:
  // https://github.com/Tencent/MMKV/blob/master/iOS/MMKV/MMKV/libMMKV.mm#L109
  bool isRunningInAppExtension =
      [[[NSBundle mainBundle] bundlePath] hasSuffix:@".appex"];

  void (^initializeBlock)(void) = ^{
    auto maybeEncryptionKey =
        CommSecureStore::get(secureStoreMMKVEncryptionKeyID);
    auto maybeIdentifier = CommSecureStore::get(secureStoreMMKVIdentifierKeyID);

    if (maybeEncryptionKey.hasValue() && maybeIdentifier.hasValue()) {
      mmkvEncryptionKey =
          [NSString stringWithCString:maybeEncryptionKey.value().c_str()
                             encoding:NSUTF8StringEncoding];
      mmkvIdentifier =
          [NSString stringWithCString:maybeIdentifier.value().c_str()
                             encoding:NSUTF8StringEncoding];
    } else if (!isRunningInAppExtension) {
      assignInitializationData();
    } else {
      throw std::runtime_error("NSE can't initialize MMKV encryption key.");
    }

    [MMKV initializeMMKV:nil
                groupDir:[Tools getAppGroupDirectoryPath]
                logLevel:MMKVLogNone];

    getMMKVInstance(mmkvIdentifier, mmkvEncryptionKey);
  };

  if (isRunningInAppExtension) {
    initializeBlock();
    return;
  }

  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, initializeBlock);
}

void CommMMKV::clearSensitiveData() {
  CommMMKV::initialize();

  @synchronized(mmkvEncryptionKey) {
    MMKV *mmkv = getMMKVInstance(mmkvIdentifier, mmkvEncryptionKey);
    [mmkv clearAll];
    BOOL storageRemoved = [MMKV removeStorage:mmkvIdentifier
                                         mode:MMKVMultiProcess];
    if (!storageRemoved) {
      throw std::runtime_error("Failed to remove mmkv storage.");
    }

    assignInitializationData();
    [MMKV initializeMMKV:nil
                groupDir:[Tools getAppGroupDirectoryPath]
                logLevel:MMKVLogNone];
    getMMKVInstance(mmkvIdentifier, mmkvEncryptionKey);
  }
}

bool CommMMKV::setString(std::string key, std::string value) {
  CommMMKV::initialize();
  MMKV *mmkv = getMMKVInstance(mmkvIdentifier, mmkvEncryptionKey);

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
  MMKV *mmkv = getMMKVInstance(mmkvIdentifier, mmkvEncryptionKey);

  NSString *value =
      [mmkv getStringForKey:[NSString stringWithCString:key.c_str()
                                               encoding:NSUTF8StringEncoding]];
  if (!value) {
    return std::nullopt;
  }
  return std::string([value UTF8String]);
}

} // namespace comm
