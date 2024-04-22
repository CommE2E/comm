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
  virtual jsi::Value processKeyserverStoreOperations(jsi::Runtime &rt, jsi::Array operations) = 0;
  virtual jsi::Value processCommunityStoreOperations(jsi::Runtime &rt, jsi::Array operations) = 0;
  virtual jsi::Value processIntegrityStoreOperations(jsi::Runtime &rt, jsi::Array operations) = 0;
  virtual jsi::Value processSyncedMetadataStoreOperations(jsi::Runtime &rt, jsi::Array operations) = 0;
  virtual jsi::Value processAuxUserStoreOperations(jsi::Runtime &rt, jsi::Array operations) = 0;
  virtual jsi::Value processThreadActivityStoreOperations(jsi::Runtime &rt, jsi::Array operations) = 0;
  virtual jsi::Value initializeCryptoAccount(jsi::Runtime &rt) = 0;
  virtual jsi::Value getUserPublicKey(jsi::Runtime &rt) = 0;
  virtual jsi::Value getOneTimeKeys(jsi::Runtime &rt, double oneTimeKeysAmount) = 0;
  virtual jsi::Value validateAndGetPrekeys(jsi::Runtime &rt) = 0;
  virtual jsi::Value validateAndUploadPrekeys(jsi::Runtime &rt, jsi::String authUserID, jsi::String authDeviceID, jsi::String authAccessToken) = 0;
  virtual jsi::Value initializeNotificationsSession(jsi::Runtime &rt, jsi::String identityKeys, jsi::String prekey, jsi::String prekeySignature, jsi::String oneTimeKey, jsi::String keyserverID) = 0;
  virtual jsi::Value isNotificationsSessionInitialized(jsi::Runtime &rt) = 0;
  virtual jsi::Value updateKeyserverDataInNotifStorage(jsi::Runtime &rt, jsi::Array keyserversData) = 0;
  virtual jsi::Value removeKeyserverDataFromNotifStorage(jsi::Runtime &rt, jsi::Array keyserverIDsToDelete) = 0;
  virtual jsi::Value getKeyserverDataFromNotifStorage(jsi::Runtime &rt, jsi::Array keyserverIDs) = 0;
  virtual jsi::Value initializeContentOutboundSession(jsi::Runtime &rt, jsi::String identityKeys, jsi::String prekey, jsi::String prekeySignature, jsi::String oneTimeKey, jsi::String deviceID) = 0;
  virtual jsi::Value initializeContentInboundSession(jsi::Runtime &rt, jsi::String identityKeys, jsi::Object encryptedContent, jsi::String deviceID, double sessionVersion, bool overwrite) = 0;
  virtual jsi::Value encrypt(jsi::Runtime &rt, jsi::String message, jsi::String deviceID) = 0;
  virtual jsi::Value decrypt(jsi::Runtime &rt, jsi::Object encryptedData, jsi::String deviceID) = 0;
  virtual jsi::Value decryptSequential(jsi::Runtime &rt, jsi::Object encryptedData, jsi::String deviceID, jsi::String messageID) = 0;
  virtual jsi::Value signMessage(jsi::Runtime &rt, jsi::String message) = 0;
  virtual double getCodeVersion(jsi::Runtime &rt) = 0;
  virtual void terminate(jsi::Runtime &rt) = 0;
  virtual jsi::Value setNotifyToken(jsi::Runtime &rt, jsi::String token) = 0;
  virtual jsi::Value clearNotifyToken(jsi::Runtime &rt) = 0;
  virtual jsi::Value stampSQLiteDBUserID(jsi::Runtime &rt, jsi::String userID) = 0;
  virtual jsi::Value getSQLiteStampedUserID(jsi::Runtime &rt) = 0;
  virtual jsi::Value clearSensitiveData(jsi::Runtime &rt) = 0;
  virtual bool checkIfDatabaseNeedsDeletion(jsi::Runtime &rt) = 0;
  virtual void reportDBOperationsFailure(jsi::Runtime &rt) = 0;
  virtual jsi::Value computeBackupKey(jsi::Runtime &rt, jsi::String password, jsi::String backupID) = 0;
  virtual jsi::Value generateRandomString(jsi::Runtime &rt, double size) = 0;
  virtual jsi::Value setCommServicesAuthMetadata(jsi::Runtime &rt, jsi::String userID, jsi::String deviceID, jsi::String accessToken) = 0;
  virtual jsi::Value getCommServicesAuthMetadata(jsi::Runtime &rt) = 0;
  virtual jsi::Value clearCommServicesAuthMetadata(jsi::Runtime &rt) = 0;
  virtual jsi::Value setCommServicesAccessToken(jsi::Runtime &rt, jsi::String accessToken) = 0;
  virtual jsi::Value clearCommServicesAccessToken(jsi::Runtime &rt) = 0;
  virtual void startBackupHandler(jsi::Runtime &rt) = 0;
  virtual void stopBackupHandler(jsi::Runtime &rt) = 0;
  virtual jsi::Value createNewBackup(jsi::Runtime &rt, jsi::String backupSecret) = 0;
  virtual jsi::Value restoreBackup(jsi::Runtime &rt, jsi::String backupSecret) = 0;
  virtual jsi::Value restoreBackupData(jsi::Runtime &rt, jsi::String backupID, jsi::String backupDataKey, jsi::String backupLogDataKey) = 0;
  virtual jsi::Value retrieveBackupKeys(jsi::Runtime &rt, jsi::String backupSecret) = 0;
  virtual jsi::Value getAllReceivedMessageToDevice(jsi::Runtime &rt) = 0;
  virtual jsi::Value removeReceivedMessagesToDevice(jsi::Runtime &rt, jsi::Array ids) = 0;

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
    jsi::Value processKeyserverStoreOperations(jsi::Runtime &rt, jsi::Array operations) override {
      static_assert(
          bridging::getParameterCount(&T::processKeyserverStoreOperations) == 2,
          "Expected processKeyserverStoreOperations(...) to have 2 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::processKeyserverStoreOperations, jsInvoker_, instance_, std::move(operations));
    }
    jsi::Value processCommunityStoreOperations(jsi::Runtime &rt, jsi::Array operations) override {
      static_assert(
          bridging::getParameterCount(&T::processCommunityStoreOperations) == 2,
          "Expected processCommunityStoreOperations(...) to have 2 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::processCommunityStoreOperations, jsInvoker_, instance_, std::move(operations));
    }
    jsi::Value processIntegrityStoreOperations(jsi::Runtime &rt, jsi::Array operations) override {
      static_assert(
          bridging::getParameterCount(&T::processIntegrityStoreOperations) == 2,
          "Expected processIntegrityStoreOperations(...) to have 2 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::processIntegrityStoreOperations, jsInvoker_, instance_, std::move(operations));
    }
    jsi::Value processSyncedMetadataStoreOperations(jsi::Runtime &rt, jsi::Array operations) override {
      static_assert(
          bridging::getParameterCount(&T::processSyncedMetadataStoreOperations) == 2,
          "Expected processSyncedMetadataStoreOperations(...) to have 2 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::processSyncedMetadataStoreOperations, jsInvoker_, instance_, std::move(operations));
    }
    jsi::Value processAuxUserStoreOperations(jsi::Runtime &rt, jsi::Array operations) override {
      static_assert(
          bridging::getParameterCount(&T::processAuxUserStoreOperations) == 2,
          "Expected processAuxUserStoreOperations(...) to have 2 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::processAuxUserStoreOperations, jsInvoker_, instance_, std::move(operations));
    }
    jsi::Value processThreadActivityStoreOperations(jsi::Runtime &rt, jsi::Array operations) override {
      static_assert(
          bridging::getParameterCount(&T::processThreadActivityStoreOperations) == 2,
          "Expected processThreadActivityStoreOperations(...) to have 2 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::processThreadActivityStoreOperations, jsInvoker_, instance_, std::move(operations));
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
    jsi::Value getOneTimeKeys(jsi::Runtime &rt, double oneTimeKeysAmount) override {
      static_assert(
          bridging::getParameterCount(&T::getOneTimeKeys) == 2,
          "Expected getOneTimeKeys(...) to have 2 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::getOneTimeKeys, jsInvoker_, instance_, std::move(oneTimeKeysAmount));
    }
    jsi::Value validateAndGetPrekeys(jsi::Runtime &rt) override {
      static_assert(
          bridging::getParameterCount(&T::validateAndGetPrekeys) == 1,
          "Expected validateAndGetPrekeys(...) to have 1 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::validateAndGetPrekeys, jsInvoker_, instance_);
    }
    jsi::Value validateAndUploadPrekeys(jsi::Runtime &rt, jsi::String authUserID, jsi::String authDeviceID, jsi::String authAccessToken) override {
      static_assert(
          bridging::getParameterCount(&T::validateAndUploadPrekeys) == 4,
          "Expected validateAndUploadPrekeys(...) to have 4 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::validateAndUploadPrekeys, jsInvoker_, instance_, std::move(authUserID), std::move(authDeviceID), std::move(authAccessToken));
    }
    jsi::Value initializeNotificationsSession(jsi::Runtime &rt, jsi::String identityKeys, jsi::String prekey, jsi::String prekeySignature, jsi::String oneTimeKey, jsi::String keyserverID) override {
      static_assert(
          bridging::getParameterCount(&T::initializeNotificationsSession) == 6,
          "Expected initializeNotificationsSession(...) to have 6 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::initializeNotificationsSession, jsInvoker_, instance_, std::move(identityKeys), std::move(prekey), std::move(prekeySignature), std::move(oneTimeKey), std::move(keyserverID));
    }
    jsi::Value isNotificationsSessionInitialized(jsi::Runtime &rt) override {
      static_assert(
          bridging::getParameterCount(&T::isNotificationsSessionInitialized) == 1,
          "Expected isNotificationsSessionInitialized(...) to have 1 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::isNotificationsSessionInitialized, jsInvoker_, instance_);
    }
    jsi::Value updateKeyserverDataInNotifStorage(jsi::Runtime &rt, jsi::Array keyserversData) override {
      static_assert(
          bridging::getParameterCount(&T::updateKeyserverDataInNotifStorage) == 2,
          "Expected updateKeyserverDataInNotifStorage(...) to have 2 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::updateKeyserverDataInNotifStorage, jsInvoker_, instance_, std::move(keyserversData));
    }
    jsi::Value removeKeyserverDataFromNotifStorage(jsi::Runtime &rt, jsi::Array keyserverIDsToDelete) override {
      static_assert(
          bridging::getParameterCount(&T::removeKeyserverDataFromNotifStorage) == 2,
          "Expected removeKeyserverDataFromNotifStorage(...) to have 2 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::removeKeyserverDataFromNotifStorage, jsInvoker_, instance_, std::move(keyserverIDsToDelete));
    }
    jsi::Value getKeyserverDataFromNotifStorage(jsi::Runtime &rt, jsi::Array keyserverIDs) override {
      static_assert(
          bridging::getParameterCount(&T::getKeyserverDataFromNotifStorage) == 2,
          "Expected getKeyserverDataFromNotifStorage(...) to have 2 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::getKeyserverDataFromNotifStorage, jsInvoker_, instance_, std::move(keyserverIDs));
    }
    jsi::Value initializeContentOutboundSession(jsi::Runtime &rt, jsi::String identityKeys, jsi::String prekey, jsi::String prekeySignature, jsi::String oneTimeKey, jsi::String deviceID) override {
      static_assert(
          bridging::getParameterCount(&T::initializeContentOutboundSession) == 6,
          "Expected initializeContentOutboundSession(...) to have 6 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::initializeContentOutboundSession, jsInvoker_, instance_, std::move(identityKeys), std::move(prekey), std::move(prekeySignature), std::move(oneTimeKey), std::move(deviceID));
    }
    jsi::Value initializeContentInboundSession(jsi::Runtime &rt, jsi::String identityKeys, jsi::Object encryptedContent, jsi::String deviceID, double sessionVersion, bool overwrite) override {
      static_assert(
          bridging::getParameterCount(&T::initializeContentInboundSession) == 6,
          "Expected initializeContentInboundSession(...) to have 6 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::initializeContentInboundSession, jsInvoker_, instance_, std::move(identityKeys), std::move(encryptedContent), std::move(deviceID), std::move(sessionVersion), std::move(overwrite));
    }
    jsi::Value encrypt(jsi::Runtime &rt, jsi::String message, jsi::String deviceID) override {
      static_assert(
          bridging::getParameterCount(&T::encrypt) == 3,
          "Expected encrypt(...) to have 3 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::encrypt, jsInvoker_, instance_, std::move(message), std::move(deviceID));
    }
    jsi::Value decrypt(jsi::Runtime &rt, jsi::Object encryptedData, jsi::String deviceID) override {
      static_assert(
          bridging::getParameterCount(&T::decrypt) == 3,
          "Expected decrypt(...) to have 3 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::decrypt, jsInvoker_, instance_, std::move(encryptedData), std::move(deviceID));
    }
    jsi::Value decryptSequential(jsi::Runtime &rt, jsi::Object encryptedData, jsi::String deviceID, jsi::String messageID) override {
      static_assert(
          bridging::getParameterCount(&T::decryptSequential) == 4,
          "Expected decryptSequential(...) to have 4 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::decryptSequential, jsInvoker_, instance_, std::move(encryptedData), std::move(deviceID), std::move(messageID));
    }
    jsi::Value signMessage(jsi::Runtime &rt, jsi::String message) override {
      static_assert(
          bridging::getParameterCount(&T::signMessage) == 2,
          "Expected signMessage(...) to have 2 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::signMessage, jsInvoker_, instance_, std::move(message));
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
    jsi::Value stampSQLiteDBUserID(jsi::Runtime &rt, jsi::String userID) override {
      static_assert(
          bridging::getParameterCount(&T::stampSQLiteDBUserID) == 2,
          "Expected stampSQLiteDBUserID(...) to have 2 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::stampSQLiteDBUserID, jsInvoker_, instance_, std::move(userID));
    }
    jsi::Value getSQLiteStampedUserID(jsi::Runtime &rt) override {
      static_assert(
          bridging::getParameterCount(&T::getSQLiteStampedUserID) == 1,
          "Expected getSQLiteStampedUserID(...) to have 1 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::getSQLiteStampedUserID, jsInvoker_, instance_);
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
    jsi::Value clearCommServicesAuthMetadata(jsi::Runtime &rt) override {
      static_assert(
          bridging::getParameterCount(&T::clearCommServicesAuthMetadata) == 1,
          "Expected clearCommServicesAuthMetadata(...) to have 1 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::clearCommServicesAuthMetadata, jsInvoker_, instance_);
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
    jsi::Value createNewBackup(jsi::Runtime &rt, jsi::String backupSecret) override {
      static_assert(
          bridging::getParameterCount(&T::createNewBackup) == 2,
          "Expected createNewBackup(...) to have 2 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::createNewBackup, jsInvoker_, instance_, std::move(backupSecret));
    }
    jsi::Value restoreBackup(jsi::Runtime &rt, jsi::String backupSecret) override {
      static_assert(
          bridging::getParameterCount(&T::restoreBackup) == 2,
          "Expected restoreBackup(...) to have 2 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::restoreBackup, jsInvoker_, instance_, std::move(backupSecret));
    }
    jsi::Value restoreBackupData(jsi::Runtime &rt, jsi::String backupID, jsi::String backupDataKey, jsi::String backupLogDataKey) override {
      static_assert(
          bridging::getParameterCount(&T::restoreBackupData) == 4,
          "Expected restoreBackupData(...) to have 4 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::restoreBackupData, jsInvoker_, instance_, std::move(backupID), std::move(backupDataKey), std::move(backupLogDataKey));
    }
    jsi::Value retrieveBackupKeys(jsi::Runtime &rt, jsi::String backupSecret) override {
      static_assert(
          bridging::getParameterCount(&T::retrieveBackupKeys) == 2,
          "Expected retrieveBackupKeys(...) to have 2 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::retrieveBackupKeys, jsInvoker_, instance_, std::move(backupSecret));
    }
    jsi::Value getAllReceivedMessageToDevice(jsi::Runtime &rt) override {
      static_assert(
          bridging::getParameterCount(&T::getAllReceivedMessageToDevice) == 1,
          "Expected getAllReceivedMessageToDevice(...) to have 1 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::getAllReceivedMessageToDevice, jsInvoker_, instance_);
    }
    jsi::Value removeReceivedMessagesToDevice(jsi::Runtime &rt, jsi::Array ids) override {
      static_assert(
          bridging::getParameterCount(&T::removeReceivedMessagesToDevice) == 2,
          "Expected removeReceivedMessagesToDevice(...) to have 2 parameters");

      return bridging::callFromJs<jsi::Value>(
          rt, &T::removeReceivedMessagesToDevice, jsInvoker_, instance_, std::move(ids));
    }

  private:
    T *instance_;
  };

  Delegate delegate_;
};

} // namespace react
} // namespace facebook
