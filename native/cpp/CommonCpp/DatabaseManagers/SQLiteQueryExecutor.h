#pragma once

#include "../CryptoTools/Persist.h"
#include "DatabaseQueryExecutor.h"
#include "NativeSQLiteConnectionManager.h"
#include "entities/AuxUserInfo.h"
#include "entities/CommunityInfo.h"
#include "entities/Draft.h"
#include "entities/IntegrityThreadHash.h"
#include "entities/KeyserverInfo.h"
#include "entities/LocalMessageInfo.h"
#include "entities/Media.h"
#include "entities/Message.h"
#include "entities/MessageSearchResult.h"
#include "entities/SQLiteStatementWrapper.h"
#include "entities/ThreadActivityEntry.h"
#include "entities/UserInfo.h"

#include <mutex>
#include <string>
#include <unordered_set>

namespace comm {

class SQLiteQueryExecutor : public DatabaseQueryExecutor {
  static void migrate();
  static sqlite3 *getConnection();
  static void closeConnection();

  static std::once_flag initialized;
  static int backupDataKeySize;
  static std::string backupLogDataKey;
  static int backupLogDataKeySize;

#ifndef EMSCRIPTEN
  static NativeSQLiteConnectionManager connectionManager;
  static std::unordered_set<std::string> backedUpTablesBlocklist;
  static void generateBackupDataKey();
  static void generateBackupLogDataKey();
  static void initializeTablesForLogMonitoring();
#else
  static SQLiteConnectionManager connectionManager;
  std::vector<MessageWithMedias>
  transformToWebMessages(const std::vector<MessageEntity> &messages) const;
#endif

  std::optional<int> getSyncedDatabaseVersion(sqlite3 *db) const;
  std::vector<MessageEntity>
  processMessagesResults(SQLiteStatementWrapper &preparedSQL) const;
  std::string getThickThreadTypesList() const;

public:
  static std::string sqliteFilePath;
  static std::string backupDataKey;

  SQLiteQueryExecutor();
  ~SQLiteQueryExecutor();
  SQLiteQueryExecutor(std::string sqliteFilePath);
  std::unique_ptr<Thread> getThread(std::string threadID) const override;
  std::string getDraft(std::string key) const override;
  void updateDraft(std::string key, std::string text) const override;
  bool moveDraft(std::string oldKey, std::string newKey) const override;
  std::vector<Draft> getAllDrafts() const override;
  void removeAllDrafts() const override;
  void removeDrafts(const std::vector<std::string> &ids) const override;
  void removeAllMessages() const override;
  std::vector<MessageEntity> getInitialMessages() const override;
  std::vector<MessageEntity>
  fetchMessages(std::string threadID, int limit, int offset) const override;
  void removeMessages(const std::vector<std::string> &ids) const override;
  void removeMessagesForThreads(
      const std::vector<std::string> &threadIDs) const override;
  void replaceMessage(const Message &message) const override;
  void rekeyMessage(std::string from, std::string to) const override;
  void replaceMessageStoreThreads(
      const std::vector<MessageStoreThread> &threads) const override;
  void
  removeMessageStoreThreads(const std::vector<std::string> &ids) const override;
  void removeAllMessageStoreThreads() const override;
  std::vector<MessageStoreThread> getAllMessageStoreThreads() const override;
  void removeAllMedia() const override;
  void
  removeMediaForMessages(const std::vector<std::string> &msgIDs) const override;
  void removeMediaForMessage(std::string msgID) const override;
  void removeMediaForThreads(
      const std::vector<std::string> &threadIDs) const override;
  void replaceMedia(const Media &media) const override;
  void rekeyMediaContainers(std::string from, std::string to) const override;
  std::vector<Thread> getAllThreads() const override;
  void removeThreads(std::vector<std::string> ids) const override;
  void replaceThread(const Thread &thread) const override;
  void removeAllThreads() const override;
  void replaceReport(const Report &report) const override;
  void removeReports(const std::vector<std::string> &ids) const override;
  void removeAllReports() const override;
  std::vector<Report> getAllReports() const override;
  void setPersistStorageItem(std::string key, std::string item) const override;
  void removePersistStorageItem(std::string key) const override;
  std::string getPersistStorageItem(std::string key) const override;
  void replaceUser(const UserInfo &userInfo) const override;
  void removeUsers(const std::vector<std::string> &ids) const override;
  void removeAllUsers() const override;
  std::vector<UserInfo> getAllUsers() const override;
  void replaceKeyserver(const KeyserverInfo &keyserverInfo) const override;
  void removeKeyservers(const std::vector<std::string> &ids) const override;
  void removeAllKeyservers() const override;
  std::vector<KeyserverInfo> getAllKeyservers() const override;
  void replaceCommunity(const CommunityInfo &communityInfo) const override;
  void removeCommunities(const std::vector<std::string> &ids) const override;
  void removeAllCommunities() const override;
  std::vector<CommunityInfo> getAllCommunities() const override;
  void replaceIntegrityThreadHashes(
      const std::vector<IntegrityThreadHash> &threadHashes) const override;
  void removeIntegrityThreadHashes(
      const std::vector<std::string> &ids) const override;
  void removeAllIntegrityThreadHashes() const override;
  std::vector<IntegrityThreadHash> getAllIntegrityThreadHashes() const override;
  void replaceSyncedMetadataEntry(
      const SyncedMetadataEntry &syncedMetadataEntry) const override;
  void
  removeSyncedMetadata(const std::vector<std::string> &names) const override;
  void removeAllSyncedMetadata() const override;
  std::vector<SyncedMetadataEntry> getAllSyncedMetadata() const override;
  void replaceAuxUserInfo(const AuxUserInfo &userInfo) const override;
  void removeAuxUserInfos(const std::vector<std::string> &ids) const override;
  void removeAllAuxUserInfos() const override;
  virtual std::vector<AuxUserInfo> getAllAuxUserInfos() const override;
  void replaceThreadActivityEntry(
      const ThreadActivityEntry &threadActivityEntry) const override;
  void removeThreadActivityEntries(
      const std::vector<std::string> &ids) const override;
  void removeAllThreadActivityEntries() const override;
  std::vector<ThreadActivityEntry> getAllThreadActivityEntries() const override;
  void replaceEntry(const EntryInfo &entryInfo) const override;
  void removeEntries(const std::vector<std::string> &ids) const override;
  void removeAllEntries() const override;
  std::vector<EntryInfo> getAllEntries() const override;
  void replaceMessageStoreLocalMessageInfo(
      const LocalMessageInfo &localMessageInfo) const override;
  void removeMessageStoreLocalMessageInfos(
      const std::vector<std::string> &ids) const override;
  void removeAllMessageStoreLocalMessageInfos() const override;
  virtual std::vector<LocalMessageInfo>
  getAllMessageStoreLocalMessageInfos() const override;
  void beginTransaction() const override;
  void commitTransaction() const override;
  void rollbackTransaction() const override;
  int getContentAccountID() const override;
  int getNotifsAccountID() const override;
  std::vector<OlmPersistSession> getOlmPersistSessionsData() const override;
  std::optional<std::string>
  getOlmPersistAccountData(int accountID) const override;
  void storeOlmPersistSession(const OlmPersistSession &session) const override;
  void storeOlmPersistAccount(int accountID, const std::string &accountData)
      const override;
  void
  storeOlmPersistData(int accountID, crypto::Persist persist) const override;
  void setNotifyToken(std::string token) const override;
  void clearNotifyToken() const override;
  void stampSQLiteDBUserID(std::string userID) const override;
  std::string getSQLiteStampedUserID() const override;
  void setMetadata(std::string entryName, std::string data) const override;
  void clearMetadata(std::string entryName) const override;
  std::string getMetadata(std::string entryName) const override;
  void restoreFromMainCompaction(
      std::string mainCompactionPath,
      std::string mainCompactionEncryptionKey,
      std::string maxVersion) const override;
  void restoreFromBackupLog(
      const std::vector<std::uint8_t> &backupLog) const override;
  void addOutboundP2PMessages(
      const std::vector<OutboundP2PMessage> &messages) const override;
  std::vector<OutboundP2PMessage> getOutboundP2PMessagesByID(
      const std::vector<std::string> &ids) const override;
  std::vector<OutboundP2PMessage> getUnsentOutboundP2PMessages() const override;
  void removeOutboundP2PMessage(
      std::string confirmedMessageID,
      std::string deviceID) const override;
  void removeAllOutboundP2PMessages(const std::string &deviceID) const override;
  void setCiphertextForOutboundP2PMessage(
      std::string messageID,
      std::string deviceID,
      std::string ciphertext) const override;
  void markOutboundP2PMessageAsSent(std::string messageID, std::string deviceID)
      const override;
  std::vector<std::string>
  resetOutboundP2PMessagesForDevice(std::string deviceID) const override;
  void addInboundP2PMessage(InboundP2PMessage message) const override;
  std::vector<InboundP2PMessage> getAllInboundP2PMessage() const override;
  void
  removeInboundP2PMessages(const std::vector<std::string> &ids) const override;
  std::vector<InboundP2PMessage>
  getInboundP2PMessagesByID(const std::vector<std::string> &ids) const override;
  std::vector<MessageEntity>
  getRelatedMessages(const std::string &messageID) const override;
  void updateMessageSearchIndex(
      std::string originalMessageID,
      std::string messageID,
      std::string processedContent) const override;
  std::vector<MessageEntity> searchMessages(
      std::string query,
      std::string threadID,
      std::optional<std::string> timestampCursor,
      std::optional<std::string> messageIDCursor) const override;
  std::vector<MessageEntity> getRelatedMessagesForSearch(
      const std::vector<std::string> &messageIDs) const override;

#ifdef EMSCRIPTEN
  std::vector<WebThread> getAllThreadsWeb() const override;
  void replaceThreadWeb(const WebThread &thread) const override;
  std::vector<MessageWithMedias> getInitialMessagesWeb() const override;
  std::vector<MessageWithMedias>
  fetchMessagesWeb(std::string threadID, int limit, int offset) const override;
  void replaceMessageWeb(const WebMessage &message) const override;
  NullableString getOlmPersistAccountDataWeb(int accountID) const override;
  std::vector<MessageWithMedias>
  getRelatedMessagesWeb(const std::string &messageID) const override;
  std::vector<MessageWithMedias> searchMessagesWeb(
      std::string query,
      std::string threadID,
      std::optional<std::string> timestampCursor,
      std::optional<std::string> messageIDCursor) const override;
#else
  static void clearSensitiveData();
  static void initialize(std::string &databasePath);
  void createMainCompaction(std::string backupID) const override;
  void captureBackupLogs() const override;
#endif
};

} // namespace comm
