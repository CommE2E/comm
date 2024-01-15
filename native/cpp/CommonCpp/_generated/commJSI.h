/**
 * This code was generated by [react-native-codegen](https://www.npmjs.com/package/react-native-codegen).
 *
 * Do not edit this file as changes may cause incorrect behavior and will be lost
 * once the code is regenerated.
 *
 * @generated by codegen project: GenerateModuleH.js
 */

#pragma once

#include <ReactCommon/TurboModule.h>
#include <react/bridging/Bridging.h>

namespace facebook {
namespace react {

class JSI_EXPORT CommCoreModuleSchemaCxxSpecJSI : public TurboModule {
protected:
  CommCoreModuleSchemaCxxSpecJSI(std::shared_ptr<CallInvoker> jsInvoker);

public:
  virtual jsi::Value getDraft(jsi::Runtime &rt, jsi::String key) = 0;
  virtual jsi::Value updateDraft(jsi::Runtime &rt, jsi::String key, jsi::String text) = 0;
  virtual jsi::Value moveDraft(jsi::Runtime &rt, jsi::String oldKey, jsi::String newKey) = 0;
  virtual jsi::Value getClientDBStore(jsi::Runtime &rt) = 0;
  virtual jsi::Value removeAllDrafts(jsi::Runtime &rt) = 0;
  virtual jsi::Array getAllMessagesSync(jsi::Runtime &rt) = 0;
  virtual jsi::Value processDraftStoreOperations(jsi::Runtime &rt, jsi::Array operations) = 0;
  virtual jsi::Value processMessageStoreOperations(jsi::Runtime &rt, jsi::Array operations) = 0;
  virtual void processMessageStoreOperationsSync(jsi::Runtime &rt, jsi::Array operations) = 0;
  virtual jsi::Array getAllThreadsSync(jsi::Runtime &rt) = 0;
  virtual jsi::Value processThreadStoreOperations(jsi::Runtime &rt, jsi::Array operations) = 0;
  virtual jsi::Value processReportStoreOperations(jsi::Runtime &rt, jsi::Array operations) = 0;
  virtual void processReportStoreOperationsSync(jsi::Runtime &rt, jsi::Array operations) = 0;
  virtual void processThreadStoreOperationsSync(jsi::Runtime &rt, jsi::Array operations) = 0;
  virtual jsi::Value processUserStoreOperations(jsi::Runtime &rt, jsi::Array operations) = 0;
  virtual jsi::Value initializeCryptoAccount(jsi::Runtime &rt) = 0;
  virtual jsi::Value getUserPublicKey(jsi::Runtime &rt) = 0;
  virtual jsi::Value getPrimaryOneTimeKeys(jsi::Runtime &rt, double oneTimeKeysAmount) = 0;
  virtual jsi::Value getNotificationsOneTimeKeys(jsi::Runtime &rt, double oneTimeKeysAmount) = 0;
  virtual jsi::Value generateAndGetPrekeys(jsi::Runtime &rt) = 0;
  virtual jsi::Value initializeNotificationsSession(jsi::Runtime &rt, jsi::String identityKeys, jsi::String prekey, jsi::String prekeySignature, jsi::String oneTimeKeys) = 0;
  virtual jsi::Value isNotificationsSessionInitialized(jsi::Runtime &rt) = 0;
  virtual jsi::Value initializeContentOutboundSession(jsi::Runtime &rt, jsi::String identityKeys, jsi::String prekey, jsi::String prekeySignature, jsi::String oneTimeKeys, jsi::String deviceID) = 0;
  virtual jsi::Value initializeContentInboundSession(jsi::Runtime &rt, jsi::String identityKeys, jsi::String encryptedMessage, jsi::String deviceID) = 0;
  virtual jsi::Value encrypt(jsi::Runtime &rt, jsi::String message, jsi::String deviceID) = 0;
  virtual jsi::Value decrypt(jsi::Runtime &rt, jsi::String message, jsi::String deviceID) = 0;
  virtual double getCodeVersion(jsi::Runtime &rt) = 0;
  virtual void terminate(jsi::Runtime &rt) = 0;
  virtual jsi::Value setNotifyToken(jsi::Runtime &rt, jsi::String token) = 0;
  virtual jsi::Value clearNotifyToken(jsi::Runtime &rt) = 0;
  virtual jsi::Value setCurrentUserID(jsi::Runtime &rt, jsi::String userID) = 0;
  virtual jsi::Value getCurrentUserID(jsi::Runtime &rt) = 0;
  virtual jsi::Value clearSensitiveData(jsi::Runtime &rt) = 0;
  virtual bool checkIfDatabaseNeedsDeletion(jsi::Runtime &rt) = 0;
  virtual void reportDBOperationsFailure(jsi::Runtime &rt) = 0;
  virtual jsi::Value computeBackupKey(jsi::Runtime &rt, jsi::String password, jsi::String backupID) = 0;
  virtual jsi::Value generateRandomString(jsi::Runtime &rt, double size) = 0;
  virtual jsi::Value setCommServicesAuthMetadata(jsi::Runtime &rt, jsi::String userID, jsi::String deviceID, jsi::String accessToken) = 0;
  virtual jsi::Value getCommServicesAuthMetadata(jsi::Runtime &rt) = 0;
  virtual jsi::Value setCommServicesAccessToken(jsi::Runtime &rt, jsi::String accessToken) = 0;
  virtual jsi::Value clearCommServicesAccessToken(jsi::Runtime &rt) = 0;
  virtual void startBackupHandler(jsi::Runtime &rt) = 0;
  virtual void stopBackupHandler(jsi::Runtime &rt) = 0;
  virtual jsi::Value createNewBackup(jsi::Runtime &rt, jsi::String backupSecret, jsi::String userData) = 0;
  virtual jsi::Value restoreBackup(jsi::Runtime &rt, jsi::String backupSecret) = 0;

};

template <typename T>
class JSI_EXPORT CommCoreModuleSchemaCxxSpec : public TurboModule {
public:
  jsi::Value get(jsi::Runtime &rt, const jsi::PropNameID &propName) override {
    return delegate_.get(rt, propName);
  }

protected:
  CommCoreModuleSchemaCxxSpec(std::shared_ptr<CallInvoker> jsInvoker)
    : TurboModule("CommTurboModule", jsInvoker),
      delegate_(static_cast<T*>(this), jsInvoker) {}

private:
  class Delegate : public CommCoreModuleSchemaCxxSpecJSI {
  public:
    Delegate(T *instance, std::shared_ptr<CallInvoker> jsInvoker) :
      CommCoreModuleSchemaCxxSpecJSI(std::move(jsInvoker)), instance_(instance) {}

    jsi::Value getDraft(jsi::Runtime &rt, jsi::String key) override {
      static_assert(
          bridging::getParameterCount(&T::getDraft) == 2,
          "Expected getDraft(...) to have 2 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::getDraft, jsInvoker_, instance_, std::move(key));
    }
    jsi::Value updateDraft(jsi::Runtime &rt, jsi::String key, jsi::String text) override {
      static_assert(
          bridging::getParameterCount(&T::updateDraft) == 3,
          "Expected updateDraft(...) to have 3 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::updateDraft, jsInvoker_, instance_, std::move(key), std::move(text));
    }
    jsi::Value moveDraft(jsi::Runtime &rt, jsi::String oldKey, jsi::String newKey) override {
      static_assert(
          bridging::getParameterCount(&T::moveDraft) == 3,
          "Expected moveDraft(...) to have 3 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::moveDraft, jsInvoker_, instance_, std::move(oldKey), std::move(newKey));
    }
    jsi::Value getClientDBStore(jsi::Runtime &rt) override {
      static_assert(
          bridging::getParameterCount(&T::getClientDBStore) == 1,
          "Expected getClientDBStore(...) to have 1 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::getClientDBStore, jsInvoker_, instance_);
    }
    jsi::Value removeAllDrafts(jsi::Runtime &rt) override {
      static_assert(
          bridging::getParameterCount(&T::removeAllDrafts) == 1,
          "Expected removeAllDrafts(...) to have 1 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::removeAllDrafts, jsInvoker_, instance_);
    }
    jsi::Array getAllMessagesSync(jsi::Runtime &rt) override {
      static_assert(
          bridging::getParameterCount(&T::getAllMessagesSync) == 1,
          "Expected getAllMessagesSync(...) to have 1 parameters");

      return bridging::callFromJs<jsi::Array>(
          rt, &T::getAllMessagesSync, jsInvoker_, instance_);
    }
    jsi::Value processDraftStoreOperations(jsi::Runtime &rt, jsi::Array operations) override {
      static_assert(
          bridging::getParameterCount(&T::processDraftStoreOperations) == 2,
          "Expected processDraftStoreOperations(...) to have 2 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::processDraftStoreOperations, jsInvoker_, instance_, std::move(operations));
    }
    jsi::Value processMessageStoreOperations(jsi::Runtime &rt, jsi::Array operations) override {
      static_assert(
          bridging::getParameterCount(&T::processMessageStoreOperations) == 2,
          "Expected processMessageStoreOperations(...) to have 2 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::processMessageStoreOperations, jsInvoker_, instance_, std::move(operations));
    }
    void processMessageStoreOperationsSync(jsi::Runtime &rt, jsi::Array operations) override {
      static_assert(
          bridging::getParameterCount(&T::processMessageStoreOperationsSync) == 2,
          "Expected processMessageStoreOperationsSync(...) to have 2 parameters");

      return bridging::callFromJs<void>(
          rt, &T::processMessageStoreOperationsSync, jsInvoker_, instance_, std::move(operations));
    }
    jsi::Array getAllThreadsSync(jsi::Runtime &rt) override {
      static_assert(
          bridging::getParameterCount(&T::getAllThreadsSync) == 1,
          "Expected getAllThreadsSync(...) to have 1 parameters");

      return bridging::callFromJs<jsi::Array>(
          rt, &T::getAllThreadsSync, jsInvoker_, instance_);
    }
    jsi::Value processThreadStoreOperations(jsi::Runtime &rt, jsi::Array operations) override {
      static_assert(
          bridging::getParameterCount(&T::processThreadStoreOperations) == 2,
          "Expected processThreadStoreOperations(...) to have 2 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::processThreadStoreOperations, jsInvoker_, instance_, std::move(operations));
    }
    jsi::Value processReportStoreOperations(jsi::Runtime &rt, jsi::Array operations) override {
      static_assert(
          bridging::getParameterCount(&T::processReportStoreOperations) == 2,
          "Expected processReportStoreOperations(...) to have 2 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::processReportStoreOperations, jsInvoker_, instance_, std::move(operations));
    }
    void processReportStoreOperationsSync(jsi::Runtime &rt, jsi::Array operations) override {
      static_assert(
          bridging::getParameterCount(&T::processReportStoreOperationsSync) == 2,
          "Expected processReportStoreOperationsSync(...) to have 2 parameters");

      return bridging::callFromJs<void>(
          rt, &T::processReportStoreOperationsSync, jsInvoker_, instance_, std::move(operations));
    }
    void processThreadStoreOperationsSync(jsi::Runtime &rt, jsi::Array operations) override {
      static_assert(
          bridging::getParameterCount(&T::processThreadStoreOperationsSync) == 2,
          "Expected processThreadStoreOperationsSync(...) to have 2 parameters");

      return bridging::callFromJs<void>(
          rt, &T::processThreadStoreOperationsSync, jsInvoker_, instance_, std::move(operations));
    }
    jsi::Value processUserStoreOperations(jsi::Runtime &rt, jsi::Array operations) override {
      static_assert(
          bridging::getParameterCount(&T::processUserStoreOperations) == 2,
          "Expected processUserStoreOperations(...) to have 2 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::processUserStoreOperations, jsInvoker_, instance_, std::move(operations));
    }
    jsi::Value initializeCryptoAccount(jsi::Runtime &rt) override {
      static_assert(
          bridging::getParameterCount(&T::initializeCryptoAccount) == 1,
          "Expected initializeCryptoAccount(...) to have 1 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::initializeCryptoAccount, jsInvoker_, instance_);
    }
    jsi::Value getUserPublicKey(jsi::Runtime &rt) override {
      static_assert(
          bridging::getParameterCount(&T::getUserPublicKey) == 1,
          "Expected getUserPublicKey(...) to have 1 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::getUserPublicKey, jsInvoker_, instance_);
    }
    jsi::Value getPrimaryOneTimeKeys(jsi::Runtime &rt, double oneTimeKeysAmount) override {
      static_assert(
          bridging::getParameterCount(&T::getPrimaryOneTimeKeys) == 2,
          "Expected getPrimaryOneTimeKeys(...) to have 2 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::getPrimaryOneTimeKeys, jsInvoker_, instance_, std::move(oneTimeKeysAmount));
    }
    jsi::Value getNotificationsOneTimeKeys(jsi::Runtime &rt, double oneTimeKeysAmount) override {
      static_assert(
          bridging::getParameterCount(&T::getNotificationsOneTimeKeys) == 2,
          "Expected getNotificationsOneTimeKeys(...) to have 2 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::getNotificationsOneTimeKeys, jsInvoker_, instance_, std::move(oneTimeKeysAmount));
    }
    jsi::Value generateAndGetPrekeys(jsi::Runtime &rt) override {
      static_assert(
          bridging::getParameterCount(&T::generateAndGetPrekeys) == 1,
          "Expected generateAndGetPrekeys(...) to have 1 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::generateAndGetPrekeys, jsInvoker_, instance_);
    }
    jsi::Value initializeNotificationsSession(jsi::Runtime &rt, jsi::String identityKeys, jsi::String prekey, jsi::String prekeySignature, jsi::String oneTimeKeys) override {
      static_assert(
          bridging::getParameterCount(&T::initializeNotificationsSession) == 5,
          "Expected initializeNotificationsSession(...) to have 5 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::initializeNotificationsSession, jsInvoker_, instance_, std::move(identityKeys), std::move(prekey), std::move(prekeySignature), std::move(oneTimeKeys));
    }
    jsi::Value isNotificationsSessionInitialized(jsi::Runtime &rt) override {
      static_assert(
          bridging::getParameterCount(&T::isNotificationsSessionInitialized) == 1,
          "Expected isNotificationsSessionInitialized(...) to have 1 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::isNotificationsSessionInitialized, jsInvoker_, instance_);
    }
    jsi::Value initializeContentOutboundSession(jsi::Runtime &rt, jsi::String identityKeys, jsi::String prekey, jsi::String prekeySignature, jsi::String oneTimeKeys, jsi::String deviceID) override {
      static_assert(
          bridging::getParameterCount(&T::initializeContentOutboundSession) == 6,
          "Expected initializeContentOutboundSession(...) to have 6 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::initializeContentOutboundSession, jsInvoker_, instance_, std::move(identityKeys), std::move(prekey), std::move(prekeySignature), std::move(oneTimeKeys), std::move(deviceID));
    }
    jsi::Value initializeContentInboundSession(jsi::Runtime &rt, jsi::String identityKeys, jsi::String encryptedMessage, jsi::String deviceID) override {
      static_assert(
          bridging::getParameterCount(&T::initializeContentInboundSession) == 4,
          "Expected initializeContentInboundSession(...) to have 4 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::initializeContentInboundSession, jsInvoker_, instance_, std::move(identityKeys), std::move(encryptedMessage), std::move(deviceID));
    }
    jsi::Value encrypt(jsi::Runtime &rt, jsi::String message, jsi::String deviceID) override {
      static_assert(
          bridging::getParameterCount(&T::encrypt) == 3,
          "Expected encrypt(...) to have 3 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::encrypt, jsInvoker_, instance_, std::move(message), std::move(deviceID));
    }
    jsi::Value decrypt(jsi::Runtime &rt, jsi::String message, jsi::String deviceID) override {
      static_assert(
          bridging::getParameterCount(&T::decrypt) == 3,
          "Expected decrypt(...) to have 3 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::decrypt, jsInvoker_, instance_, std::move(message), std::move(deviceID));
    }
    double getCodeVersion(jsi::Runtime &rt) override {
      static_assert(
          bridging::getParameterCount(&T::getCodeVersion) == 1,
          "Expected getCodeVersion(...) to have 1 parameters");

      return bridging::callFromJs<double>(
          rt, &T::getCodeVersion, jsInvoker_, instance_);
    }
    void terminate(jsi::Runtime &rt) override {
      static_assert(
          bridging::getParameterCount(&T::terminate) == 1,
          "Expected terminate(...) to have 1 parameters");

      return bridging::callFromJs<void>(
          rt, &T::terminate, jsInvoker_, instance_);
    }
    jsi::Value setNotifyToken(jsi::Runtime &rt, jsi::String token) override {
      static_assert(
          bridging::getParameterCount(&T::setNotifyToken) == 2,
          "Expected setNotifyToken(...) to have 2 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::setNotifyToken, jsInvoker_, instance_, std::move(token));
    }
    jsi::Value clearNotifyToken(jsi::Runtime &rt) override {
      static_assert(
          bridging::getParameterCount(&T::clearNotifyToken) == 1,
          "Expected clearNotifyToken(...) to have 1 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::clearNotifyToken, jsInvoker_, instance_);
    }
    jsi::Value setCurrentUserID(jsi::Runtime &rt, jsi::String userID) override {
      static_assert(
          bridging::getParameterCount(&T::setCurrentUserID) == 2,
          "Expected setCurrentUserID(...) to have 2 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::setCurrentUserID, jsInvoker_, instance_, std::move(userID));
    }
    jsi::Value getCurrentUserID(jsi::Runtime &rt) override {
      static_assert(
          bridging::getParameterCount(&T::getCurrentUserID) == 1,
          "Expected getCurrentUserID(...) to have 1 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::getCurrentUserID, jsInvoker_, instance_);
    }
    jsi::Value clearSensitiveData(jsi::Runtime &rt) override {
      static_assert(
          bridging::getParameterCount(&T::clearSensitiveData) == 1,
          "Expected clearSensitiveData(...) to have 1 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::clearSensitiveData, jsInvoker_, instance_);
    }
    bool checkIfDatabaseNeedsDeletion(jsi::Runtime &rt) override {
      static_assert(
          bridging::getParameterCount(&T::checkIfDatabaseNeedsDeletion) == 1,
          "Expected checkIfDatabaseNeedsDeletion(...) to have 1 parameters");

      return bridging::callFromJs<bool>(
          rt, &T::checkIfDatabaseNeedsDeletion, jsInvoker_, instance_);
    }
    void reportDBOperationsFailure(jsi::Runtime &rt) override {
      static_assert(
          bridging::getParameterCount(&T::reportDBOperationsFailure) == 1,
          "Expected reportDBOperationsFailure(...) to have 1 parameters");

      return bridging::callFromJs<void>(
          rt, &T::reportDBOperationsFailure, jsInvoker_, instance_);
    }
    jsi::Value computeBackupKey(jsi::Runtime &rt, jsi::String password, jsi::String backupID) override {
      static_assert(
          bridging::getParameterCount(&T::computeBackupKey) == 3,
          "Expected computeBackupKey(...) to have 3 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::computeBackupKey, jsInvoker_, instance_, std::move(password), std::move(backupID));
    }
    jsi::Value generateRandomString(jsi::Runtime &rt, double size) override {
      static_assert(
          bridging::getParameterCount(&T::generateRandomString) == 2,
          "Expected generateRandomString(...) to have 2 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::generateRandomString, jsInvoker_, instance_, std::move(size));
    }
    jsi::Value setCommServicesAuthMetadata(jsi::Runtime &rt, jsi::String userID, jsi::String deviceID, jsi::String accessToken) override {
      static_assert(
          bridging::getParameterCount(&T::setCommServicesAuthMetadata) == 4,
          "Expected setCommServicesAuthMetadata(...) to have 4 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::setCommServicesAuthMetadata, jsInvoker_, instance_, std::move(userID), std::move(deviceID), std::move(accessToken));
    }
    jsi::Value getCommServicesAuthMetadata(jsi::Runtime &rt) override {
      static_assert(
          bridging::getParameterCount(&T::getCommServicesAuthMetadata) == 1,
          "Expected getCommServicesAuthMetadata(...) to have 1 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::getCommServicesAuthMetadata, jsInvoker_, instance_);
    }
    jsi::Value setCommServicesAccessToken(jsi::Runtime &rt, jsi::String accessToken) override {
      static_assert(
          bridging::getParameterCount(&T::setCommServicesAccessToken) == 2,
          "Expected setCommServicesAccessToken(...) to have 2 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::setCommServicesAccessToken, jsInvoker_, instance_, std::move(accessToken));
    }
    jsi::Value clearCommServicesAccessToken(jsi::Runtime &rt) override {
      static_assert(
          bridging::getParameterCount(&T::clearCommServicesAccessToken) == 1,
          "Expected clearCommServicesAccessToken(...) to have 1 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::clearCommServicesAccessToken, jsInvoker_, instance_);
    }
    void startBackupHandler(jsi::Runtime &rt) override {
      static_assert(
          bridging::getParameterCount(&T::startBackupHandler) == 1,
          "Expected startBackupHandler(...) to have 1 parameters");

      return bridging::callFromJs<void>(
          rt, &T::startBackupHandler, jsInvoker_, instance_);
    }
    void stopBackupHandler(jsi::Runtime &rt) override {
      static_assert(
          bridging::getParameterCount(&T::stopBackupHandler) == 1,
          "Expected stopBackupHandler(...) to have 1 parameters");

      return bridging::callFromJs<void>(
          rt, &T::stopBackupHandler, jsInvoker_, instance_);
    }
    jsi::Value createNewBackup(jsi::Runtime &rt, jsi::String backupSecret, jsi::String userData) override {
      static_assert(
          bridging::getParameterCount(&T::createNewBackup) == 3,
          "Expected createNewBackup(...) to have 3 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::createNewBackup, jsInvoker_, instance_, std::move(backupSecret), std::move(userData));
    }
    jsi::Value restoreBackup(jsi::Runtime &rt, jsi::String backupSecret) override {
      static_assert(
          bridging::getParameterCount(&T::restoreBackup) == 2,
          "Expected restoreBackup(...) to have 2 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::restoreBackup, jsInvoker_, instance_, std::move(backupSecret));
    }

  private:
    T *instance_;
  };

  Delegate delegate_;
};

} // namespace react
} // namespace facebook
