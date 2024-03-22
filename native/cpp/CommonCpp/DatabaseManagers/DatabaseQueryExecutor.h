#pragma once

#include "../CryptoTools/Persist.h"
#include "entities/CommunityInfo.h"
#include "entities/Draft.h"
#include "entities/KeyserverInfo.h"
#include "entities/Message.h"
#include "entities/MessageStoreThread.h"
#include "entities/MessageToDevice.h"
#include "entities/OlmPersistAccount.h"
#include "entities/OlmPersistSession.h"
#include "entities/PersistItem.h"
#include "entities/Report.h"
#include "entities/SyncedMetadataEntry.h"
#include "entities/Thread.h"
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
  virtual std::vector<std::pair<Message, std::vector<Media>>>
  getAllMessages() const = 0;
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
  removeMediaForMessages(const std::vector<std::string> &msg_ids) const = 0;
  virtual void removeMediaForMessage(std::string msg_id) const = 0;
  virtual void
  removeMediaForThreads(const std::vector<std::string> &thread_ids) const = 0;
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
  virtual void replaceUser(const UserInfo &user_info) const = 0;
  virtual void removeUsers(const std::vector<std::string> &ids) const = 0;
  virtual void removeAllUsers() const = 0;
  virtual std::vector<UserInfo> getAllUsers() const = 0;
  virtual void replaceKeyserver(const KeyserverInfo &keyserver_info) const = 0;
  virtual void removeKeyservers(const std::vector<std::string> &ids) const = 0;
  virtual void removeAllKeyservers() const = 0;
  virtual std::vector<KeyserverInfo> getAllKeyservers() const = 0;
  virtual void replaceCommunity(const CommunityInfo &community_info) const = 0;
  virtual void removeCommunities(const std::vector<std::string> &ids) const = 0;
  virtual void removeAllCommunities() const = 0;
  virtual std::vector<CommunityInfo> getAllCommunities() const = 0;
  virtual void replaceSyncedMetadataEntry(
      const SyncedMetadataEntry &synced_metadata_entry) const = 0;
  virtual void
  removeSyncedMetadata(const std::vector<std::string> &names) const = 0;
  virtual void removeAllSyncedMetadata() const = 0;
  virtual std::vector<SyncedMetadataEntry> getAllSyncedMetadata() const = 0;
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
  virtual void setCurrentUserID(std::string userID) const = 0;
  virtual std::string getCurrentUserID() const = 0;
  virtual void setMetadata(std::string entry_name, std::string data) const = 0;
  virtual void clearMetadata(std::string entry_name) const = 0;
  virtual std::string getMetadata(std::string entry_name) const = 0;
  virtual void restoreFromMainCompaction(
      std::string mainCompactionPath,
      std::string mainCompactionEncryptionKey) const = 0;
  virtual void
  restoreFromBackupLog(const std::vector<std::uint8_t> &backupLog) const = 0;
  virtual void addMessagesToDevice(
      const std::vector<ClientMessageToDevice> &messages) const = 0;
  virtual std::vector<ClientMessageToDevice>
  getAllMessagesToDevice(const std::string &deviceID) const = 0;
  virtual void removeMessagesToDeviceOlderThan(
      const ClientMessageToDevice &lastConfirmedMessage) const = 0;
  virtual void
  removeAllMessagesForDevice(const std::string &deviceID) const = 0;

#ifdef EMSCRIPTEN
  virtual std::vector<WebThread> getAllThreadsWeb() const = 0;
  virtual void replaceThreadWeb(const WebThread &thread) const = 0;
  virtual std::vector<MessageWithMedias> getAllMessagesWeb() const = 0;
  virtual void replaceMessageWeb(const WebMessage &message) const = 0;
  virtual NullableString getOlmPersistAccountDataWeb(int accountID) const = 0;
#else
  virtual void createMainCompaction(std::string backupID) const = 0;
  virtual void captureBackupLogs() const = 0;
#endif
};

} // namespace comm
