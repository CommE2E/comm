#import "CommMMKV.h"
#import "../../cpp/CommonCpp/CryptoTools/Tools.h"
#import "CommSecureStore.h"
#import "Logger.h"
#import "Tools.h"

#import <Foundation/Foundation.h>
#import <MMKV.h>
#import <MMKVCore/MMKV.h>

// Core MMKV C++ implementation and Android wrapper have public `lock` and
// `unlock` methods while Obj-C wrapper doesn't. However Obj-C wrapper has
// private instance variable of type `mmkv::MMKV *`. Interface redeclaration
// below lets us access it. This pattern is hacky but it is well known in
// Obj-C and used in our codebase in CommSecureStore.
@interface MMKV () {
@public
  mmkv::MMKV *m_mmkv;
}
@end

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

CommMMKV::ScopedCommMMKVLock::ScopedCommMMKVLock() {
  CommMMKV::initialize();
  MMKV *mmkv = getMMKVInstance(mmkvIdentifier, mmkvEncryptionKey);
  mmkv->m_mmkv->lock();
}

CommMMKV::ScopedCommMMKVLock::~ScopedCommMMKVLock() {
  MMKV *mmkv = getMMKVInstance(mmkvIdentifier, mmkvEncryptionKey);
  mmkv->m_mmkv->unlock();
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
      throw CommMMKV::InitFromNSEForbiddenError(
          std::string("NSE can't initialize MMKV encryption key."));
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

bool CommMMKV::setInt(std::string key, int value) {
  CommMMKV::initialize();
  MMKV *mmkv = getMMKVInstance(mmkvIdentifier, mmkvEncryptionKey);

  BOOL result =
      [mmkv setInt64:value
              forKey:[NSString stringWithCString:key.c_str()
                                        encoding:NSUTF8StringEncoding]];

  if (!result) {
    Logger::log("Attempt to write in background or failure during write.");
  }
  return result;
}

std::optional<int> CommMMKV::getInt(std::string key, int noValue) {
  CommMMKV::initialize();
  MMKV *mmkv = getMMKVInstance(mmkvIdentifier, mmkvEncryptionKey);

  int value =
      [mmkv getInt64ForKey:[NSString stringWithCString:key.c_str()
                                              encoding:NSUTF8StringEncoding]
              defaultValue:noValue
                  hasValue:nil];

  if (value == noValue) {
    return std::nullopt;
  }

  return value;
}

std::vector<std::string> CommMMKV::getAllKeys() {
  CommMMKV::initialize();
  MMKV *mmkv = getMMKVInstance(mmkvIdentifier, mmkvEncryptionKey);

  NSArray<NSString *> *allKeys = [mmkv allKeys];
  std::vector<std::string> result;

  for (NSString *key in allKeys) {
    result.emplace_back(std::string([key UTF8String]));
  }

  return result;
}

void CommMMKV::removeKeys(const std::vector<std::string> &keys) {
  CommMMKV::initialize();
  MMKV *mmkv = getMMKVInstance(mmkvIdentifier, mmkvEncryptionKey);

  NSMutableArray<NSString *> *keysObjC = [[NSMutableArray alloc] init];
  for (const auto &key : keys) {
    [keysObjC addObject:[NSString stringWithCString:key.c_str()
                                           encoding:NSUTF8StringEncoding]];
  }
  [mmkv removeValuesForKeys:keysObjC];
}

void CommMMKV::addElementToStringSet(std::string setKey, std::string element) {
  NSString *setKeyObjC = [NSString stringWithCString:setKey.c_str()
                                            encoding:NSUTF8StringEncoding];
  NSString *elementObjC = [NSString stringWithCString:element.c_str()
                                             encoding:NSUTF8StringEncoding];

  CommMMKV::ScopedCommMMKVLock();
  MMKV *mmkv = getMMKVInstance(mmkvIdentifier, mmkvEncryptionKey);
  NSMutableSet *stringSet =
      [mmkv getObjectOfClass:NSMutableSet.class forKey:setKeyObjC];

  if (stringSet) {
    [stringSet addObject:elementObjC];
  } else {
    stringSet = [NSMutableSet setWithObject:elementObjC];
  }

  [mmkv setObject:stringSet forKey:setKeyObjC];
}

void CommMMKV::removeElementFromStringSet(
    std::string setKey,
    std::string element) {
  NSString *setKeyObjC = [NSString stringWithCString:setKey.c_str()
                                            encoding:NSUTF8StringEncoding];
  NSString *elementObjC = [NSString stringWithCString:element.c_str()
                                             encoding:NSUTF8StringEncoding];

  CommMMKV::ScopedCommMMKVLock();
  MMKV *mmkv = getMMKVInstance(mmkvIdentifier, mmkvEncryptionKey);
  NSMutableSet *stringSet =
      [mmkv getObjectOfClass:NSMutableSet.class forKey:setKeyObjC];

  if (!stringSet) {
    return;
  }

  [stringSet removeObject:elementObjC];
  [mmkv setObject:stringSet forKey:setKeyObjC];
}

std::vector<std::string> CommMMKV::getStringSet(std::string setKey) {
  NSString *setKeyObjC = [NSString stringWithCString:setKey.c_str()
                                            encoding:NSUTF8StringEncoding];

  CommMMKV::ScopedCommMMKVLock();
  MMKV *mmkv = getMMKVInstance(mmkvIdentifier, mmkvEncryptionKey);
  NSMutableSet *stringSet =
      [mmkv getObjectOfClass:NSMutableSet.class forKey:setKeyObjC];

  std::vector<std::string> stringSetCpp{};
  for (NSString *element in stringSet) {
    stringSetCpp.emplace_back(std::string{[element UTF8String]});
  }

  return stringSetCpp;
}

} // namespace comm
