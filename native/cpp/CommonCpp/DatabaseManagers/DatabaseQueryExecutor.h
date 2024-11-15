#pragma once

#include "../CryptoTools/Persist.h"
#include "entities/AuxUserInfo.h"
#include "entities/CommunityInfo.h"
#include "entities/Draft.h"
#include "entities/EntryInfo.h"
#include "entities/InboundP2PMessage.h"
#include "entities/IntegrityThreadHash.h"
#include "entities/KeyserverInfo.h"
#include "entities/LocalMessageInfo.h"
#include "entities/Media.h"
#include "entities/Message.h"
#include "entities/MessageStoreThread.h"
#include "entities/OlmPersistAccount.h"
#include "entities/OlmPersistSession.h"
#include "entities/OutboundP2PMessage.h"
#include "entities/PersistItem.h"
#include "entities/Report.h"
#include "entities/SyncedMetadataEntry.h"
#include "entities/Thread.h"
#include "entities/ThreadActivityEntry.h"
#include "entities/UserInfo.h"

#include <string>

namespace comm {

/**
 * if any initialization/cleaning up steps are required for specific
 * database managers they should appear in constructors/destructors
 * following the RAII pattern
 */
class DatabaseQueryExecutor {
public:
  virtual std::string getDraft(std::string key) const = 0;
  virtual std::unique_ptr<Thread> getThread(std::string threadID) const = 0;
  virtual void updateDraft(std::string key, std::string text) const = 0;
  virtual bool moveDraft(std::string oldKey, std::string newKey) const = 0;
  virtual std::vector<Draft> getAllDrafts() const = 0;
  virtual void removeAllDrafts() const = 0;
  virtual void removeDrafts(const std::vector<std::string> &ids) const = 0;
  virtual void removeAllMessages() const = 0;
  virtual std::vector<MessageEntity> getInitialMessages() const = 0;
  virtual std::vector<MessageEntity>
  fetchMessages(std::string threadID, int limit, int offset) const = 0;
  virtual void removeMessages(const std::vector<std::string> &ids) const = 0;
  virtual void
  removeMessagesForThreads(const std::vector<std::string> &threadIDs) const = 0;
  virtual void replaceMessage(const Message &message) const = 0;
  virtual void rekeyMessage(std::string from, std::string to) const = 0;
  virtual void removeAllMedia() const = 0;
  virtual void replaceMessageStoreThreads(
      const std::vector<MessageStoreThread> &threads) const = 0;
  virtual void
  removeMessageStoreThreads(const std::vector<std::string> &ids) const = 0;
  virtual void removeAllMessageStoreThreads() const = 0;
  virtual std::vector<MessageStoreThread> getAllMessageStoreThreads() const = 0;
  virtual void
  removeMediaForMessages(const std::vector<std::string> &msgIDs) const = 0;
  virtual void removeMediaForMessage(std::string msgID) const = 0;
  virtual void
  removeMediaForThreads(const std::vector<std::string> &threadIDs) const = 0;
  virtual void replaceMedia(const Media &media) const = 0;
  virtual void rekeyMediaContainers(std::string from, std::string to) const = 0;
  virtual std::vector<Thread> getAllThreads() const = 0;
  virtual void removeThreads(std::vector<std::string> ids) const = 0;
  virtual void replaceThread(const Thread &thread) const = 0;
  virtual void removeAllThreads() const = 0;
  virtual void replaceReport(const Report &report) const = 0;
  virtual void removeReports(const std::vector<std::string> &ids) const = 0;
  virtual void removeAllReports() const = 0;
  virtual std::vector<Report> getAllReports() const = 0;
  virtual void
  setPersistStorageItem(std::string key, std::string item) const = 0;
  virtual void removePersistStorageItem(std::string key) const = 0;
  virtual std::string getPersistStorageItem(std::string key) const = 0;
  virtual void replaceUser(const UserInfo &userInfo) const = 0;
  virtual void removeUsers(const std::vector<std::string> &ids) const = 0;
  virtual void removeAllUsers() const = 0;
  virtual std::vector<UserInfo> getAllUsers() const = 0;
  virtual void replaceKeyserver(const KeyserverInfo &keyserverInfo) const = 0;
  virtual void removeKeyservers(const std::vector<std::string> &ids) const = 0;
  virtual void removeAllKeyservers() const = 0;
  virtual std::vector<KeyserverInfo> getAllKeyservers() const = 0;
  virtual void replaceCommunity(const CommunityInfo &communityInfo) const = 0;
  virtual void removeCommunities(const std::vector<std::string> &ids) const = 0;
  virtual void removeAllCommunities() const = 0;
  virtual std::vector<CommunityInfo> getAllCommunities() const = 0;
  virtual void replaceIntegrityThreadHashes(
      const std::vector<IntegrityThreadHash> &threadHashes) const = 0;
  virtual void
  removeIntegrityThreadHashes(const std::vector<std::string> &ids) const = 0;
  virtual void removeAllIntegrityThreadHashes() const = 0;
  virtual std::vector<IntegrityThreadHash>
  getAllIntegrityThreadHashes() const = 0;
  virtual void replaceSyncedMetadataEntry(
      const SyncedMetadataEntry &syncedMetadataEntry) const = 0;
  virtual void
  removeSyncedMetadata(const std::vector<std::string> &names) const = 0;
  virtual void removeAllSyncedMetadata() const = 0;
  virtual std::vector<SyncedMetadataEntry> getAllSyncedMetadata() const = 0;
  virtual void replaceAuxUserInfo(const AuxUserInfo &userInfo) const = 0;
  virtual void
  removeAuxUserInfos(const std::vector<std::string> &ids) const = 0;
  virtual void removeAllAuxUserInfos() const = 0;
  virtual std::vector<AuxUserInfo> getAllAuxUserInfos() const = 0;
  virtual void replaceThreadActivityEntry(
      const ThreadActivityEntry &threadActivityEntry) const = 0;
  virtual void
  removeThreadActivityEntries(const std::vector<std::string> &ids) const = 0;
  virtual void removeAllThreadActivityEntries() const = 0;
  virtual std::vector<ThreadActivityEntry>
  getAllThreadActivityEntries() const = 0;
  virtual void replaceEntry(const EntryInfo &entryInfo) const = 0;
  virtual void removeEntries(const std::vector<std::string> &ids) const = 0;
  virtual void removeAllEntries() const = 0;
  virtual std::vector<EntryInfo> getAllEntries() const = 0;
  virtual void replaceMessageStoreLocalMessageInfo(
      const LocalMessageInfo &localMessageInfo) const = 0;
  virtual void removeMessageStoreLocalMessageInfos(
      const std::vector<std::string> &ids) const = 0;
  virtual void removeAllMessageStoreLocalMessageInfos() const = 0;
  virtual std::vector<LocalMessageInfo>
  getAllMessageStoreLocalMessageInfos() const = 0;
  virtual void beginTransaction() const = 0;
  virtual void commitTransaction() const = 0;
  virtual void rollbackTransaction() const = 0;
  virtual int getContentAccountID() const = 0;
  virtual int getNotifsAccountID() const = 0;
  virtual std::vector<OlmPersistSession> getOlmPersistSessionsData() const = 0;
  virtual std::optional<std::string>
  getOlmPersistAccountData(int accountID) const = 0;
  virtual void
  storeOlmPersistSession(const OlmPersistSession &session) const = 0;
  virtual void storeOlmPersistAccount(
      int accountID,
      const std::string &accountData) const = 0;
  virtual void
  storeOlmPersistData(int accountID, crypto::Persist persist) const = 0;
  virtual void setNotifyToken(std::string token) const = 0;
  virtual void clearNotifyToken() const = 0;
  virtual void stampSQLiteDBUserID(std::string userID) const = 0;
  virtual std::string getSQLiteStampedUserID() const = 0;
  virtual void setMetadata(std::string entryName, std::string data) const = 0;
  virtual void clearMetadata(std::string entryName) const = 0;
  virtual std::string getMetadata(std::string entryName) const = 0;
  virtual void restoreFromMainCompaction(
      std::string mainCompactionPath,
      std::string mainCompactionEncryptionKey,
      std::string maxVersion) const = 0;
  virtual void
  restoreFromBackupLog(const std::vector<std::uint8_t> &backupLog) const = 0;
  virtual void addOutboundP2PMessages(
      const std::vector<OutboundP2PMessage> &messages) const = 0;
  virtual std::vector<OutboundP2PMessage>
  getOutboundP2PMessagesByID(const std::vector<std::string> &ids) const = 0;
  virtual std::vector<OutboundP2PMessage>
  getUnsentOutboundP2PMessages() const = 0;
  virtual void removeOutboundP2PMessage(
      std::string confirmedMessageID,
      std::string deviceID) const = 0;
  virtual void
  removeAllOutboundP2PMessages(const std::string &deviceID) const = 0;
  virtual void setCiphertextForOutboundP2PMessage(
      std::string messageID,
      std::string deviceID,
      std::string ciphertext) const = 0;
  virtual void markOutboundP2PMessageAsSent(
      std::string messageID,
      std::string deviceID) const = 0;
  virtual std::vector<std::string>
  resetOutboundP2PMessagesForDevice(std::string deviceID) const = 0;
  virtual void addInboundP2PMessage(InboundP2PMessage message) const = 0;
  virtual std::vector<InboundP2PMessage> getAllInboundP2PMessage() const = 0;
  virtual void
  removeInboundP2PMessages(const std::vector<std::string> &ids) const = 0;
  virtual std::vector<InboundP2PMessage>
  getInboundP2PMessagesByID(const std::vector<std::string> &ids) const = 0;
  virtual std::vector<MessageEntity>
  getRelatedMessages(const std::string &messageID) const = 0;
  virtual void updateMessageSearchIndex(
      std::string originalMessageID,
      std::string messageID,
      std::string processedContent) const = 0;
  virtual std::vector<MessageEntity> searchMessages(
      std::string query,
      std::string threadID,
      std::optional<std::string> timestampCursor,
      std::optional<std::string> messageIDCursor) const = 0;
  virtual std::vector<MessageEntity> getRelatedMessagesForSearch(
      const std::vector<std::string> &messageIDs) const = 0;
  virtual ~DatabaseQueryExecutor() = default;

#ifdef EMSCRIPTEN
  virtual std::vector<WebThread> getAllThreadsWeb() const = 0;
  virtual void replaceThreadWeb(const WebThread &thread) const = 0;
  virtual std::vector<MessageWithMedias> getInitialMessagesWeb() const = 0;
  virtual std::vector<MessageWithMedias>
  fetchMessagesWeb(std::string threadID, int limit, int offset) const = 0;
  virtual void replaceMessageWeb(const WebMessage &message) const = 0;
  virtual NullableString getOlmPersistAccountDataWeb(int accountID) const = 0;
  virtual std::vector<MessageWithMedias>
  getRelatedMessagesWeb(const std::string &messageID) const = 0;
  virtual std::vector<MessageWithMedias> searchMessagesWeb(
      std::string query,
      std::string threadID,
      std::optional<std::string> timestampCursor,
      std::optional<std::string> messageIDCursor) const = 0;
#else
  virtual void createMainCompaction(std::string backupID) const = 0;
  virtual void captureBackupLogs() const = 0;
#endif
};

} // namespace comm
