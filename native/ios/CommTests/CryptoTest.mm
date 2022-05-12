#import "../../cpp/CommonCpp/CryptoTools/CryptoModule.h"
#import "../../cpp/CommonCpp/CryptoTools/Tools.h"
#import "../../cpp/CommonCpp/Tools/Logger.h"
#import <functional>

#import <XCTest/XCTest.h>

#import <stdexcept>

using namespace comm::crypto;

@interface CryptoTest : XCTestCase

@end

@implementation CryptoTest

struct ModuleWithKeys {
  std::shared_ptr<CryptoModule> module;
  Keys keys;
};

enum class RepickleOption {
  NONE = 0,
  SENDER = 1,
  RECEIVER = 2,
  BOTH = 3,
};

size_t currentId = 1000;

- (void)setUp {
  // Put setup code here. This method is called before the invocation of each
  // test method in the class.
}

- (void)tearDown {
  // Put teardown code here. This method is called after the invocation of each
  // test method in the class.
}

void sendMessage(ModuleWithKeys &moduleAData, ModuleWithKeys &moduleBData) {
  if (!moduleAData.module->hasSessionFor(moduleBData.module->id)) {
    moduleAData.module->initializeOutboundForSendingSession(
        moduleBData.module->id,
        moduleBData.keys.identityKeys,
        moduleBData.keys.oneTimeKeys);
  }
  std::string message{Tools::generateRandomString(50)};
  EncryptedData encryptedData =
      moduleAData.module->encrypt(moduleBData.module->id, message);
  comm::Logger::log("encrypted: " + message);

  if (!moduleBData.module->hasSessionFor(moduleAData.module->id)) {
    moduleBData.module->initializeInboundForReceivingSession(
        moduleAData.module->id,
        encryptedData.message,
        moduleAData.keys.identityKeys);
  }

  std::string decrypted = moduleBData.module->decrypt(
      moduleAData.module->id, encryptedData, moduleAData.keys.identityKeys);
  comm::Logger::log("decrypted:  " + decrypted);

  XCTAssert(
      memcmp(message.data(), decrypted.data(), message.size()) == 0,
      @"message decrypted properly");
}

void repickle(std::shared_ptr<CryptoModule> module) {
  std::string pickleKey{Tools::generateRandomString(20)};
  Persist pickled = module->storeAsB64(pickleKey);
  std::string userId = module->id;
  module.reset(new CryptoModule(userId));
  module->restoreFromB64(pickleKey, pickled);
};

ModuleWithKeys initializeModuleWithKeys(size_t id) {
  std::shared_ptr<CryptoModule> module(
      new CryptoModule(std::to_string(1000 + id)));

  std::string idKeys = module->getIdentityKeys();
  std::string otKeys = module->getOneTimeKeys(50);
  Keys keys = CryptoModule::keysFromStrings(idKeys, otKeys);

  return {module, keys};
}

void sendAlternatingMessages(
    ModuleWithKeys &firstSenderData,
    ModuleWithKeys &firstReceiverData,
    size_t numberOfMessages) {
  for (size_t i = 0; i < numberOfMessages; ++i) {
    if (i % 2 == 0) {
      sendMessage(firstSenderData, firstReceiverData);
    } else {
      sendMessage(firstReceiverData, firstSenderData);
    }
  }
}

void sendMessagesOneWay(
    ModuleWithKeys &senderData,
    ModuleWithKeys &receiverData,
    size_t numberOfMessages) {
  for (size_t i = 0; i < numberOfMessages; ++i) {
    sendMessage(senderData, receiverData);
  }
}

void performRepickle(
    ModuleWithKeys &a,
    ModuleWithKeys &b,
    RepickleOption repickleOption,
    std::function<void(ModuleWithKeys &a, ModuleWithKeys &b)> sendCallback) {
  for (size_t i = 0; i < 5; ++i) {
    switch (repickleOption) {
      case RepickleOption::SENDER: {
        repickle(a.module);
        break;
      }
      case RepickleOption::RECEIVER: {
        repickle(b.module);
        break;
      }
      case RepickleOption::BOTH: {
        repickle(a.module);
        repickle(b.module);
        break;
      }
    }
    sendCallback(a, b);
  }
}

void sendMessagesWrapperTwoUsers(
    RepickleOption repickleOption,
    std::function<void(ModuleWithKeys &a, ModuleWithKeys &b)> sendCallback) {
  ModuleWithKeys moduleA = initializeModuleWithKeys(++currentId);
  ModuleWithKeys moduleB = initializeModuleWithKeys(++currentId);

  performRepickle(moduleA, moduleB, repickleOption, sendCallback);
}

void sendMessagesWrapperThreeUsers(
    RepickleOption repickleOption,
    std::function<void(ModuleWithKeys &a, ModuleWithKeys &b)> sendCallback) {
  ModuleWithKeys moduleA = initializeModuleWithKeys(++currentId);
  ModuleWithKeys moduleB = initializeModuleWithKeys(++currentId);
  ModuleWithKeys moduleC = initializeModuleWithKeys(++currentId);

  performRepickle(moduleA, moduleB, repickleOption, sendCallback);
  performRepickle(moduleA, moduleC, repickleOption, sendCallback);
  performRepickle(moduleB, moduleC, repickleOption, sendCallback);
}

// for 2.1
auto callback1 = [](ModuleWithKeys &a, ModuleWithKeys &b) {
  sendAlternatingMessages(a, b, 50);
};

// for 2.2
auto callback2 = [](ModuleWithKeys &a, ModuleWithKeys &b) {
  sendMessagesOneWay(a, b, 10);
  sendAlternatingMessages(b, a, 50);
};

// for 2.3
auto callback3 = [](ModuleWithKeys &a, ModuleWithKeys &b) {
  sendMessagesOneWay(a, b, 10);
  sendMessagesOneWay(b, a, 10);
  sendAlternatingMessages(a, b, 50);
};

void testMessagesWrapper(
    RepickleOption repickleOption,
    std::function<void(ModuleWithKeys &, ModuleWithKeys &)> callback) {
  try {
    sendMessagesWrapperTwoUsers(repickleOption, callback);
    sendMessagesWrapperThreeUsers(repickleOption, callback);
  } catch (std::runtime_error &e) {
    comm::Logger::log("test message error: " + std::string(e.what()));
    XCTAssert(false);
  }
}

- (void)testMessagesAlternateNoReprickle {
  testMessagesWrapper(RepickleOption::NONE, callback1);
}

- (void)testMessagesAlternateRepickleA {
  testMessagesWrapper(RepickleOption::SENDER, callback1);
}

- (void)testMessagesAlternateRepickleB {
  testMessagesWrapper(RepickleOption::RECEIVER, callback1);
}

- (void)testMessagesAlternateRepickleBoth {
  testMessagesWrapper(RepickleOption::BOTH, callback1);
}

- (void)testMessagesNThenAlternateNoReprickle {
  testMessagesWrapper(RepickleOption::NONE, callback2);
}

- (void)testMessagesNThenAlternateRepickleA {
  testMessagesWrapper(RepickleOption::SENDER, callback2);
}

- (void)testMessagesNThenAlternateRepickleB {
  testMessagesWrapper(RepickleOption::RECEIVER, callback2);
}

- (void)testMessagesNThenAlternateRepickleBoth {
  testMessagesWrapper(RepickleOption::BOTH, callback2);
}

- (void)testMessagesNThenNThenAlternateNoReprickle {
  testMessagesWrapper(RepickleOption::NONE, callback3);
}

- (void)testMessagesNThenNThenAlternateRepickleA {
  testMessagesWrapper(RepickleOption::SENDER, callback3);
}

- (void)testMessagesNThenNThenAlternateRepickleB {
  testMessagesWrapper(RepickleOption::RECEIVER, callback3);
}

- (void)testMessagesNThenNThenAlternateRepickleBoth {
  testMessagesWrapper(RepickleOption::BOTH, callback3);
}

- (void)testTwoUsersCreatingOutboundSessions {
  try {
    for (size_t wrappingI = 0; wrappingI < 2; ++wrappingI) {
      std::shared_ptr<CryptoModule> moduleA(
          new CryptoModule(std::to_string(1000 + (wrappingI * 2))));
      std::string aIdKeys = moduleA->getIdentityKeys();
      std::string aOtKeys = moduleA->getOneTimeKeys(50);
      Keys aKeys = CryptoModule::keysFromStrings(aIdKeys, aOtKeys);

      std::shared_ptr<CryptoModule> moduleB(
          new CryptoModule(std::to_string(1001 + (wrappingI * 2))));
      std::string bIdKeys = moduleB->getIdentityKeys();
      std::string bOtKeys = moduleB->getOneTimeKeys(50);
      Keys bKeys = CryptoModule::keysFromStrings(bIdKeys, bOtKeys);

      std::string message1{Tools::generateRandomString(50)};
      std::string message2{Tools::generateRandomString(50)};

      if (!moduleA->hasSessionFor(moduleB->id)) {
        moduleA->initializeOutboundForSendingSession(
            moduleB->id, bKeys.identityKeys, bKeys.oneTimeKeys);
      }
      EncryptedData encryptedData1 = moduleA->encrypt(moduleB->id, message1);

      if (!moduleB->hasSessionFor(moduleA->id)) {
        moduleB->initializeOutboundForSendingSession(
            moduleA->id, aKeys.identityKeys, aKeys.oneTimeKeys);
      }
      EncryptedData encryptedData2 = moduleB->encrypt(moduleA->id, message2);

      XCTAssert(
          moduleA->hasSessionFor(moduleB->id) &&
              moduleB->hasSessionFor(moduleA->id),
          @"sessions created successfully");

      // they both have outbound sessions so one of them has to remove their
      // outbound session and start an inbound session
      bool matches = moduleB->matchesInboundSession(
          moduleA->id, encryptedData1, aKeys.identityKeys);
      if (!matches) {
        moduleB->initializeInboundForReceivingSession(
            moduleA->id, encryptedData1.message, aKeys.identityKeys, true);
      }

      std::string decrypted1 =
          moduleB->decrypt(moduleA->id, encryptedData1, aKeys.identityKeys);
      // user who reinitialized the session has to encrypt it again
      // it's very important to decrypt first, otherwise it's not going to work
      // because the `session`'s `received_message` won't be changed and
      // `encrypt` will try to send a prekey message but it shouldn't
      EncryptedData encryptedData3 = moduleB->encrypt(moduleA->id, message2);

      std::string decrypted2 =
          moduleA->decrypt(moduleB->id, encryptedData3, bKeys.identityKeys);

      XCTAssert(
          memcmp(message1.data(), decrypted1.data(), message1.size()) == 0,
          @"A -> B message decrypted successfully");
      XCTAssert(
          memcmp(message2.data(), decrypted2.data(), message2.size()) == 0,
          @"B -> A message decrypted successfully");

      ModuleWithKeys moduleAData = {moduleA, aKeys};
      ModuleWithKeys moduleBData = {moduleB, bKeys};

      for (size_t i = 0; i < 20; ++i) {
        if (wrappingI % 2 == 0) {
          sendMessage(moduleAData, moduleBData);
        } else {
          sendMessage(moduleBData, moduleAData);
        }
      }
    }
  } catch (std::runtime_error &e) {
    comm::Logger::log("testSessionsIssue error: " + std::string(e.what()));
    XCTAssert(false);
  }
}

@end
