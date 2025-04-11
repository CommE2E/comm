#include "SQLiteQueryExecutor.h"
#include "Logger.h"
#include "SQLiteSchema.h"
#include "SQLiteUtils.h"

#include "../NativeModules/PersistentStorageUtilities/MessageOperationsUtilities/MessageTypeEnum.h"
#include "../NativeModules/PersistentStorageUtilities/ThreadOperationsUtilities/ThreadTypeEnum.h"
#include "entities/CommunityInfo.h"
#include "entities/EntityQueryHelpers.h"
#include "entities/EntryInfo.h"
#include "entities/IntegrityThreadHash.h"
#include "entities/KeyserverInfo.h"
#include "entities/LocalMessageInfo.h"
#include "entities/Metadata.h"
#include "entities/SQLiteDataConverters.h"
#include "entities/SyncedMetadataEntry.h"
#include "entities/UserInfo.h"
#include <fstream>
#include <iostream>
#include <thread>

#ifndef EMSCRIPTEN
#include "../CryptoTools/CryptoModule.h"
#include "../Tools/ServicesUtils.h"
#include "CommSecureStore.h"
#include "PlatformSpecificTools.h"
#include "StaffUtils.h"
#include "lib.rs.h"
#endif

const int CONTENT_ACCOUNT_ID = 1;
const int NOTIFS_ACCOUNT_ID = 2;

namespace comm {

std::string SQLiteQueryExecutor::sqliteFilePath;
std::once_flag SQLiteQueryExecutor::initialized;

std::string SQLiteQueryExecutor::backupDataKey;
int SQLiteQueryExecutor::backupDataKeySize = 64;

std::string SQLiteQueryExecutor::backupLogDataKey;
int SQLiteQueryExecutor::backupLogDataKeySize = 32;

std::unordered_set<std::string> SQLiteQueryExecutor::backedUpTablesAllowlist = {
    "drafts",
    "threads",
    "message_store_threads",
    "users",
    "synced_metadata",
    "aux_users",
    "entries",
};

#ifndef EMSCRIPTEN
NativeSQLiteConnectionManager SQLiteQueryExecutor::connectionManager;
#else
SQLiteConnectionManager SQLiteQueryExecutor::connectionManager;
#endif

// We don't want to run `PRAGMA key = ...;`
// on main web database. The context is here:
// https://linear.app/comm/issue/ENG-6398/issues-with-sqlcipher-on-web
void default_on_db_open_callback(sqlite3 *db) {
#ifndef EMSCRIPTEN
  SQLiteUtils::setEncryptionKey(db, SQLiteQueryExecutor::backupDataKey);
#endif
}

void SQLiteQueryExecutor::migrate() {
// We don't want to run `PRAGMA key = ...;`
// on main web database. The context is here:
// https://linear.app/comm/issue/ENG-6398/issues-with-sqlcipher-on-web
#ifndef EMSCRIPTEN
  SQLiteUtils::validateEncryption(
      SQLiteQueryExecutor::sqliteFilePath, SQLiteQueryExecutor::backupDataKey);
#endif

  sqlite3 *db;
  sqlite3_open(SQLiteQueryExecutor::sqliteFilePath.c_str(), &db);
  default_on_db_open_callback(db);

  std::stringstream db_path;
  db_path << "db path: " << SQLiteQueryExecutor::sqliteFilePath.c_str()
          << std::endl;
  Logger::log(db_path.str());

  auto db_version = SQLiteUtils::getDatabaseVersion(db);
  std::stringstream version_msg;
  version_msg << "db version: " << db_version << std::endl;
  Logger::log(version_msg.str());

  if (db_version == 0) {
    auto db_created = SQLiteSchema::setupDatabase(db);
    if (!db_created) {
      sqlite3_close(db);
      Logger::log("Database structure creation error.");
      throw std::runtime_error("Database structure creation error");
    }
    Logger::log("Database structure created.");

    sqlite3_close(db);
    return;
  }

  SQLiteSchema::legacyMigrate(db);
  sqlite3_close(db);
}

SQLiteQueryExecutor::SQLiteQueryExecutor() {
  SQLiteQueryExecutor::migrate();
#ifndef EMSCRIPTEN
  SQLiteQueryExecutor::initializeTablesForLogMonitoring();

  std::string currentBackupID = this->getMetadata("backupID");
  if (!ServicesUtils::fullBackupSupport || !currentBackupID.size()) {
    return;
  }
  SQLiteQueryExecutor::connectionManager.setLogsMonitoring(true);
#endif
}

SQLiteQueryExecutor::SQLiteQueryExecutor(std::string sqliteFilePath) {
  SQLiteQueryExecutor::sqliteFilePath = sqliteFilePath;
  SQLiteQueryExecutor::migrate();
}

sqlite3 *SQLiteQueryExecutor::getConnection() {
  if (SQLiteQueryExecutor::connectionManager.getConnection()) {
    return SQLiteQueryExecutor::connectionManager.getConnection();
  }
  SQLiteQueryExecutor::connectionManager.initializeConnection(
      SQLiteQueryExecutor::sqliteFilePath, default_on_db_open_callback);
  return SQLiteQueryExecutor::connectionManager.getConnection();
}

void SQLiteQueryExecutor::closeConnection() {
  SQLiteQueryExecutor::connectionManager.closeConnection();
}

SQLiteQueryExecutor::~SQLiteQueryExecutor() {
  SQLiteQueryExecutor::closeConnection();
}

std::string SQLiteQueryExecutor::getDraft(std::string key) const {
  static std::string getDraftByPrimaryKeySQL =
      "SELECT * "
      "FROM drafts "
      "WHERE key = ?;";
  std::unique_ptr<Draft> draft = getEntityByPrimaryKey<Draft>(
      SQLiteQueryExecutor::getConnection(), getDraftByPrimaryKeySQL, key);
  return (draft == nullptr) ? "" : draft->text;
}

std::unique_ptr<Thread>
SQLiteQueryExecutor::getThread(std::string threadID) const {
  static std::string getThreadByPrimaryKeySQL =
      "SELECT * "
      "FROM threads "
      "WHERE id = ?;";
  return getEntityByPrimaryKey<Thread>(
      SQLiteQueryExecutor::getConnection(), getThreadByPrimaryKeySQL, threadID);
}

void SQLiteQueryExecutor::updateDraft(std::string key, std::string text) const {
  static std::string replaceDraftSQL =
      "REPLACE INTO drafts (key, text) "
      "VALUES (?, ?);";
  Draft draft = {key, text};
  replaceEntity<Draft>(
      SQLiteQueryExecutor::getConnection(), replaceDraftSQL, draft);
}

bool SQLiteQueryExecutor::moveDraft(std::string oldKey, std::string newKey)
    const {
  std::string draftText = this->getDraft(oldKey);
  if (!draftText.size()) {
    return false;
  }
  static std::string rekeyDraftSQL =
      "UPDATE OR REPLACE drafts "
      "SET key = ? "
      "WHERE key = ?;";
  rekeyAllEntities(
      SQLiteQueryExecutor::getConnection(), rekeyDraftSQL, oldKey, newKey);
  return true;
}

std::vector<Draft> SQLiteQueryExecutor::getAllDrafts() const {
  static std::string getAllDraftsSQL =
      "SELECT * "
      "FROM drafts;";
  return getAllEntities<Draft>(
      SQLiteQueryExecutor::getConnection(), getAllDraftsSQL);
}

void SQLiteQueryExecutor::removeAllDrafts() const {
  static std::string removeAllDraftsSQL = "DELETE FROM drafts;";
  removeAllEntities(SQLiteQueryExecutor::getConnection(), removeAllDraftsSQL);
}

void SQLiteQueryExecutor::removeDrafts(
    const std::vector<std::string> &ids) const {
  if (!ids.size()) {
    return;
  }

  std::stringstream removeDraftsByKeysSQLStream;
  removeDraftsByKeysSQLStream << "DELETE FROM drafts "
                                 "WHERE key IN "
                              << getSQLStatementArray(ids.size()) << ";";

  removeEntitiesByKeys(
      SQLiteQueryExecutor::getConnection(),
      removeDraftsByKeysSQLStream.str(),
      ids);
}

void SQLiteQueryExecutor::removeAllMessages() const {
  static std::string removeAllMessagesSQL = "DELETE FROM messages;";
  removeAllEntities(SQLiteQueryExecutor::getConnection(), removeAllMessagesSQL);
}

std::string SQLiteQueryExecutor::getThickThreadTypesList() const {
  std::stringstream resultStream;
  for (auto it = THICK_THREAD_TYPES.begin(); it != THICK_THREAD_TYPES.end();
       ++it) {
    int typeInt = static_cast<int>(*it);
    resultStream << typeInt;

    if (it + 1 != THICK_THREAD_TYPES.end()) {
      resultStream << ",";
    }
  }
  return resultStream.str();
}

std::vector<MessageEntity> SQLiteQueryExecutor::getInitialMessages() const {
  static std::string getInitialMessagesSQL =
      "SELECT "
      "  s.id, s.local_id, s.thread, s.user, s.type, s.future_type, "
      "  s.content, s.time, m.id, m.container, m.thread, m.uri, m.type, "
      "  m.extras "
      "FROM ( "
      "  SELECT "
      "    m.*, "
      "    ROW_NUMBER() OVER ( "
      "      PARTITION BY thread ORDER BY m.time DESC, m.id DESC "
      "    ) AS r "
      "  FROM messages AS m "
      ") AS s "
      "LEFT JOIN media AS m "
      "  ON s.id = m.container "
      "INNER JOIN threads AS t "
      "  ON s.thread = t.id "
      "WHERE s.r <= 20 OR t.type NOT IN ( " +
      this->getThickThreadTypesList() +
      ") "
      "ORDER BY s.time, s.id;";
  SQLiteStatementWrapper preparedSQL(
      SQLiteQueryExecutor::getConnection(),
      getInitialMessagesSQL,
      "Failed to retrieve initial messages.");
  return this->processMessagesResults(preparedSQL);
}

std::vector<MessageEntity> SQLiteQueryExecutor::fetchMessages(
    std::string threadID,
    int limit,
    int offset) const {
  static std::string query =
      "SELECT "
      "  m.id, m.local_id, m.thread, m.user, m.type, m.future_type, "
      "  m.content, m.time, media.id, media.container, media.thread, "
      "  media.uri, media.type, media.extras "
      "FROM messages AS m "
      "LEFT JOIN media "
      "  ON m.id = media.container "
      "WHERE m.thread = ? "
      "ORDER BY m.time DESC, m.id DESC "
      "LIMIT ? OFFSET ?;";
  SQLiteStatementWrapper preparedSQL(
      SQLiteQueryExecutor::getConnection(), query, "Failed to fetch messages.");

  bindStringToSQL(threadID.c_str(), preparedSQL, 1);
  bindIntToSQL(limit, preparedSQL, 2);
  bindIntToSQL(offset, preparedSQL, 3);

  return this->processMessagesResults(preparedSQL);
}

std::vector<MessageEntity> SQLiteQueryExecutor::processMessagesResults(
    SQLiteStatementWrapper &preparedSQL) const {
  std::string prevMsgIdx{};
  std::vector<MessageEntity> messages;

  for (int stepResult = sqlite3_step(preparedSQL); stepResult == SQLITE_ROW;
       stepResult = sqlite3_step(preparedSQL)) {
    Message message = Message::fromSQLResult(preparedSQL, 0);
    if (message.id == prevMsgIdx) {
      messages.back().second.push_back(Media::fromSQLResult(preparedSQL, 8));
    } else {
      prevMsgIdx = message.id;
      std::vector<Media> mediaForMsg;
      if (sqlite3_column_type(preparedSQL, 8) != SQLITE_NULL) {
        mediaForMsg.push_back(Media::fromSQLResult(preparedSQL, 8));
      }
      messages.push_back(std::make_pair(std::move(message), mediaForMsg));
    }
  }
  return messages;
}

void SQLiteQueryExecutor::removeMessages(
    const std::vector<std::string> &ids) const {
  if (!ids.size()) {
    return;
  }

  std::stringstream removeMessagesByKeysSQLStream;
  removeMessagesByKeysSQLStream << "DELETE FROM messages "
                                   "WHERE id IN "
                                << getSQLStatementArray(ids.size()) << ";";
  removeEntitiesByKeys(
      SQLiteQueryExecutor::getConnection(),
      removeMessagesByKeysSQLStream.str(),
      ids);
}

void SQLiteQueryExecutor::removeMessagesForThreads(
    const std::vector<std::string> &threadIDs) const {
  if (!threadIDs.size()) {
    return;
  }

  std::stringstream removeMessagesByKeysSQLStream;
  removeMessagesByKeysSQLStream << "DELETE FROM messages "
                                   "WHERE thread IN "
                                << getSQLStatementArray(threadIDs.size())
                                << ";";

  removeEntitiesByKeys(
      SQLiteQueryExecutor::getConnection(),
      removeMessagesByKeysSQLStream.str(),
      threadIDs);
}

void SQLiteQueryExecutor::replaceMessage(const Message &message) const {
  static std::string replaceMessageSQL =
      "REPLACE INTO messages "
      "(id, local_id, thread, user, type, future_type, content, time) "
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?);";

  replaceEntity<Message>(
      SQLiteQueryExecutor::getConnection(), replaceMessageSQL, message);
}

void SQLiteQueryExecutor::updateMessageSearchIndex(
    std::string originalMessageID,
    std::string messageID,
    std::string processedContent) const {

  sqlite3 *db = SQLiteQueryExecutor::getConnection();
  int bindResult = 0;
  std::unique_ptr<SQLiteStatementWrapper> preparedSQL;

  static std::string insertMessageSearchResultSQL =
      "INSERT INTO message_search("
      "  original_message_id, message_id, processed_content) "
      "VALUES (?, ?, ?);";
  static std::string updateMessageSearchResultSQL =
      "UPDATE message_search "
      "SET message_id = ?, processed_content = ? "
      "WHERE original_message_id = ?;";

  if (originalMessageID == messageID) {
    preparedSQL = std::make_unique<SQLiteStatementWrapper>(
        db,
        insertMessageSearchResultSQL,
        "Failed to update message search entry.");

    bindStringToSQL(originalMessageID, *preparedSQL, 1);
    bindStringToSQL(messageID, *preparedSQL, 2);
    bindResult = bindStringToSQL(processedContent, *preparedSQL, 3);
  } else {
    preparedSQL = std::make_unique<SQLiteStatementWrapper>(
        db,
        updateMessageSearchResultSQL,
        "Failed to update message search entry.");

    bindStringToSQL(messageID, *preparedSQL, 1);
    bindStringToSQL(processedContent, *preparedSQL, 2);
    bindResult = bindStringToSQL(originalMessageID, *preparedSQL, 3);
  }

  if (bindResult != SQLITE_OK) {
    std::stringstream error_message;
    error_message << "Failed to bind key to SQL statement. Details: "
                  << sqlite3_errstr(bindResult) << std::endl;
    Logger::log(error_message.str());
    throw std::runtime_error(error_message.str());
  }

  sqlite3_step(*preparedSQL);
}

void SQLiteQueryExecutor::rekeyMessage(std::string from, std::string to) const {
  static std::string rekeyMessageSQL =
      "UPDATE OR REPLACE messages "
      "SET id = ? "
      "WHERE id = ?";
  rekeyAllEntities(
      SQLiteQueryExecutor::getConnection(), rekeyMessageSQL, from, to);
}

void SQLiteQueryExecutor::removeAllMedia() const {
  static std::string removeAllMediaSQL = "DELETE FROM media;";
  removeAllEntities(SQLiteQueryExecutor::getConnection(), removeAllMediaSQL);
}

void SQLiteQueryExecutor::removeMediaForMessages(
    const std::vector<std::string> &msgIDs) const {
  if (!msgIDs.size()) {
    return;
  }

  std::stringstream removeMediaByKeysSQLStream;
  removeMediaByKeysSQLStream << "DELETE FROM media "
                                "WHERE container IN "
                             << getSQLStatementArray(msgIDs.size()) << ";";

  removeEntitiesByKeys(
      SQLiteQueryExecutor::getConnection(),
      removeMediaByKeysSQLStream.str(),
      msgIDs);
}

void SQLiteQueryExecutor::removeMediaForMessage(std::string msgID) const {
  static std::string removeMediaByKeySQL =
      "DELETE FROM media "
      "WHERE container IN (?);";
  std::vector<std::string> keys = {msgID};
  removeEntitiesByKeys(
      SQLiteQueryExecutor::getConnection(), removeMediaByKeySQL, keys);
}

void SQLiteQueryExecutor::removeMediaForThreads(
    const std::vector<std::string> &threadIDs) const {
  if (!threadIDs.size()) {
    return;
  }

  std::stringstream removeMediaByKeysSQLStream;
  removeMediaByKeysSQLStream << "DELETE FROM media "
                                "WHERE thread IN "
                             << getSQLStatementArray(threadIDs.size()) << ";";

  removeEntitiesByKeys(
      SQLiteQueryExecutor::getConnection(),
      removeMediaByKeysSQLStream.str(),
      threadIDs);
}

void SQLiteQueryExecutor::replaceMedia(const Media &media) const {
  static std::string replaceMediaSQL =
      "REPLACE INTO media "
      "(id, container, thread, uri, type, extras) "
      "VALUES (?, ?, ?, ?, ?, ?)";
  replaceEntity<Media>(
      SQLiteQueryExecutor::getConnection(), replaceMediaSQL, media);
}

void SQLiteQueryExecutor::rekeyMediaContainers(std::string from, std::string to)
    const {
  static std::string rekeyMediaContainersSQL =
      "UPDATE media SET container = ? WHERE container = ?;";
  rekeyAllEntities(
      SQLiteQueryExecutor::getConnection(), rekeyMediaContainersSQL, from, to);
}

void SQLiteQueryExecutor::replaceMessageStoreThreads(
    const std::vector<MessageStoreThread> &threads) const {
  static std::string replaceMessageStoreThreadSQL =
      "REPLACE INTO message_store_threads "
      "(id, start_reached) "
      "VALUES (?, ?);";

  for (auto &thread : threads) {
    replaceEntity<MessageStoreThread>(
        SQLiteQueryExecutor::getConnection(),
        replaceMessageStoreThreadSQL,
        thread);
  }
}

void SQLiteQueryExecutor::removeAllMessageStoreThreads() const {
  static std::string removeAllMessageStoreThreadsSQL =
      "DELETE FROM message_store_threads;";
  removeAllEntities(
      SQLiteQueryExecutor::getConnection(), removeAllMessageStoreThreadsSQL);
}

void SQLiteQueryExecutor::removeMessageStoreThreads(
    const std::vector<std::string> &ids) const {
  if (!ids.size()) {
    return;
  }

  std::stringstream removeMessageStoreThreadsByKeysSQLStream;
  removeMessageStoreThreadsByKeysSQLStream
      << "DELETE FROM message_store_threads "
         "WHERE id IN "
      << getSQLStatementArray(ids.size()) << ";";

  removeEntitiesByKeys(
      SQLiteQueryExecutor::getConnection(),
      removeMessageStoreThreadsByKeysSQLStream.str(),
      ids);
}

std::vector<MessageStoreThread>
SQLiteQueryExecutor::getAllMessageStoreThreads() const {
  static std::string getAllMessageStoreThreadsSQL =
      "SELECT * "
      "FROM message_store_threads;";
  return getAllEntities<MessageStoreThread>(
      SQLiteQueryExecutor::getConnection(), getAllMessageStoreThreadsSQL);
}

std::vector<Thread> SQLiteQueryExecutor::getAllThreads() const {
  static std::string getAllThreadsSQL =
      "SELECT * "
      "FROM threads;";
  return getAllEntities<Thread>(
      SQLiteQueryExecutor::getConnection(), getAllThreadsSQL);
};

void SQLiteQueryExecutor::removeThreads(std::vector<std::string> ids) const {
  if (!ids.size()) {
    return;
  }

  std::stringstream removeThreadsByKeysSQLStream;
  removeThreadsByKeysSQLStream << "DELETE FROM threads "
                                  "WHERE id IN "
                               << getSQLStatementArray(ids.size()) << ";";

  removeEntitiesByKeys(
      SQLiteQueryExecutor::getConnection(),
      removeThreadsByKeysSQLStream.str(),
      ids);
};

void SQLiteQueryExecutor::replaceThread(const Thread &thread) const {
  static std::string replaceThreadSQL =
      "REPLACE INTO threads ("
      " id, type, name, description, color, creation_time, parent_thread_id,"
      " containing_thread_id, community, members, roles, current_user,"
      " source_message_id, replies_count, avatar, pinned_count, timestamps) "
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);";

  replaceEntity<Thread>(
      SQLiteQueryExecutor::getConnection(), replaceThreadSQL, thread);
};

void SQLiteQueryExecutor::removeAllThreads() const {
  static std::string removeAllThreadsSQL = "DELETE FROM threads;";
  removeAllEntities(SQLiteQueryExecutor::getConnection(), removeAllThreadsSQL);
};

void SQLiteQueryExecutor::replaceReport(const Report &report) const {
  static std::string replaceReportSQL =
      "REPLACE INTO reports (id, report) "
      "VALUES (?, ?);";

  replaceEntity<Report>(
      SQLiteQueryExecutor::getConnection(), replaceReportSQL, report);
}

void SQLiteQueryExecutor::removeAllReports() const {
  static std::string removeAllReportsSQL = "DELETE FROM reports;";
  removeAllEntities(SQLiteQueryExecutor::getConnection(), removeAllReportsSQL);
}

void SQLiteQueryExecutor::removeReports(
    const std::vector<std::string> &ids) const {
  if (!ids.size()) {
    return;
  }

  std::stringstream removeReportsByKeysSQLStream;
  removeReportsByKeysSQLStream << "DELETE FROM reports "
                                  "WHERE id IN "
                               << getSQLStatementArray(ids.size()) << ";";
  removeEntitiesByKeys(
      SQLiteQueryExecutor::getConnection(),
      removeReportsByKeysSQLStream.str(),
      ids);
}

std::vector<Report> SQLiteQueryExecutor::getAllReports() const {
  static std::string getAllReportsSQL =
      "SELECT * "
      "FROM reports;";
  return getAllEntities<Report>(
      SQLiteQueryExecutor::getConnection(), getAllReportsSQL);
}

void SQLiteQueryExecutor::setPersistStorageItem(
    std::string key,
    std::string item) const {
  static std::string replacePersistStorageItemSQL =
      "REPLACE INTO persist_storage (key, item) "
      "VALUES (?, ?);";
  PersistItem entry{
      key,
      item,
  };
  replaceEntity<PersistItem>(
      SQLiteQueryExecutor::getConnection(),
      replacePersistStorageItemSQL,
      entry);
}

void SQLiteQueryExecutor::removePersistStorageItem(std::string key) const {
  static std::string removePersistStorageItemByKeySQL =
      "DELETE FROM persist_storage "
      "WHERE key IN (?);";
  std::vector<std::string> keys = {key};
  removeEntitiesByKeys(
      SQLiteQueryExecutor::getConnection(),
      removePersistStorageItemByKeySQL,
      keys);
}

std::string SQLiteQueryExecutor::getPersistStorageItem(std::string key) const {
  static std::string getPersistStorageItemByPrimaryKeySQL =
      "SELECT * "
      "FROM persist_storage "
      "WHERE key = ?;";
  std::unique_ptr<PersistItem> entry = getEntityByPrimaryKey<PersistItem>(
      SQLiteQueryExecutor::getConnection(),
      getPersistStorageItemByPrimaryKeySQL,
      key);
  return (entry == nullptr) ? "" : entry->item;
}

void SQLiteQueryExecutor::replaceUser(const UserInfo &userInfo) const {
  static std::string replaceUserSQL =
      "REPLACE INTO users (id, user_info) "
      "VALUES (?, ?);";
  replaceEntity<UserInfo>(
      SQLiteQueryExecutor::getConnection(), replaceUserSQL, userInfo);
}

void SQLiteQueryExecutor::removeAllUsers() const {
  static std::string removeAllUsersSQL = "DELETE FROM users;";
  removeAllEntities(SQLiteQueryExecutor::getConnection(), removeAllUsersSQL);
}

void SQLiteQueryExecutor::removeUsers(
    const std::vector<std::string> &ids) const {
  if (!ids.size()) {
    return;
  }

  std::stringstream removeUsersByKeysSQLStream;
  removeUsersByKeysSQLStream << "DELETE FROM users "
                                "WHERE id IN "
                             << getSQLStatementArray(ids.size()) << ";";
  removeEntitiesByKeys(
      SQLiteQueryExecutor::getConnection(),
      removeUsersByKeysSQLStream.str(),
      ids);
}

void SQLiteQueryExecutor::replaceKeyserver(
    const KeyserverInfo &keyserverInfo) const {
  static std::string replaceKeyserverSQL =
      "REPLACE INTO keyservers (id, keyserver_info) "
      "VALUES (:id, :keyserver_info);";
  replaceEntity<KeyserverInfo>(
      SQLiteQueryExecutor::getConnection(), replaceKeyserverSQL, keyserverInfo);

  static std::string replaceKeyserverSyncedSQL =
      "REPLACE INTO keyservers_synced (id, keyserver_info) "
      "VALUES (:id, :synced_keyserver_info);";
  replaceEntity<KeyserverInfo>(
      SQLiteQueryExecutor::getConnection(),
      replaceKeyserverSyncedSQL,
      keyserverInfo);
}

void SQLiteQueryExecutor::removeAllKeyservers() const {
  static std::string removeAllKeyserversSQL = "DELETE FROM keyservers;";
  removeAllEntities(
      SQLiteQueryExecutor::getConnection(), removeAllKeyserversSQL);
  static std::string removeAllKeyserversSyncedSQL =
      "DELETE FROM keyservers_synced;";
  removeAllEntities(
      SQLiteQueryExecutor::getConnection(), removeAllKeyserversSyncedSQL);
}

void SQLiteQueryExecutor::removeKeyservers(
    const std::vector<std::string> &ids) const {
  if (!ids.size()) {
    return;
  }

  auto idArray = getSQLStatementArray(ids.size());

  std::stringstream removeKeyserversByKeysSQLStream;
  removeKeyserversByKeysSQLStream << "DELETE FROM keyservers "
                                     "WHERE id IN "
                                  << idArray << ";";

  removeEntitiesByKeys(
      SQLiteQueryExecutor::getConnection(),
      removeKeyserversByKeysSQLStream.str(),
      ids);

  std::stringstream removeKeyserversSyncedByKeysSQLStream;
  removeKeyserversSyncedByKeysSQLStream << "DELETE FROM keyservers_synced "
                                           "WHERE id IN "
                                        << idArray << ";";

  removeEntitiesByKeys(
      SQLiteQueryExecutor::getConnection(),
      removeKeyserversSyncedByKeysSQLStream.str(),
      ids);
}

std::vector<KeyserverInfo> SQLiteQueryExecutor::getAllKeyservers() const {
  static std::string getAllKeyserversSQL =
      "SELECT "
      "  synced.id, "
      "  COALESCE(keyservers.keyserver_info, ''), "
      "  synced.keyserver_info "
      "FROM keyservers_synced synced "
      "LEFT JOIN keyservers "
      "  ON synced.id = keyservers.id;";
  return getAllEntities<KeyserverInfo>(
      SQLiteQueryExecutor::getConnection(), getAllKeyserversSQL);
}

std::vector<UserInfo> SQLiteQueryExecutor::getAllUsers() const {
  static std::string getAllUsersSQL =
      "SELECT * "
      "FROM users;";
  return getAllEntities<UserInfo>(
      SQLiteQueryExecutor::getConnection(), getAllUsersSQL);
}

void SQLiteQueryExecutor::replaceCommunity(
    const CommunityInfo &communityInfo) const {
  static std::string replaceCommunitySQL =
      "REPLACE INTO communities (id, community_info) "
      "VALUES (?, ?);";
  replaceEntity<CommunityInfo>(
      SQLiteQueryExecutor::getConnection(), replaceCommunitySQL, communityInfo);
}

void SQLiteQueryExecutor::removeAllCommunities() const {
  static std::string removeAllCommunitiesSQL = "DELETE FROM communities;";
  removeAllEntities(
      SQLiteQueryExecutor::getConnection(), removeAllCommunitiesSQL);
}

void SQLiteQueryExecutor::removeCommunities(
    const std::vector<std::string> &ids) const {
  if (!ids.size()) {
    return;
  }

  std::stringstream removeCommunitiesByKeysSQLStream;
  removeCommunitiesByKeysSQLStream << "DELETE FROM communities "
                                      "WHERE id IN "
                                   << getSQLStatementArray(ids.size()) << ";";

  removeEntitiesByKeys(
      SQLiteQueryExecutor::getConnection(),
      removeCommunitiesByKeysSQLStream.str(),
      ids);
}

std::vector<CommunityInfo> SQLiteQueryExecutor::getAllCommunities() const {
  static std::string getAllCommunitiesSQL =
      "SELECT * "
      "FROM communities;";
  return getAllEntities<CommunityInfo>(
      SQLiteQueryExecutor::getConnection(), getAllCommunitiesSQL);
}

void SQLiteQueryExecutor::replaceIntegrityThreadHashes(
    const std::vector<IntegrityThreadHash> &threadHashes) const {
  static std::string replaceIntegrityThreadHashSQL =
      "REPLACE INTO integrity_store (id, thread_hash) "
      "VALUES (?, ?);";
  for (const IntegrityThreadHash &integrityThreadHash : threadHashes) {
    replaceEntity<IntegrityThreadHash>(
        SQLiteQueryExecutor::getConnection(),
        replaceIntegrityThreadHashSQL,
        integrityThreadHash);
  }
}

void SQLiteQueryExecutor::removeAllIntegrityThreadHashes() const {
  static std::string removeAllIntegrityThreadHashesSQL =
      "DELETE FROM integrity_store;";
  removeAllEntities(
      SQLiteQueryExecutor::getConnection(), removeAllIntegrityThreadHashesSQL);
}

void SQLiteQueryExecutor::removeIntegrityThreadHashes(
    const std::vector<std::string> &ids) const {
  if (!ids.size()) {
    return;
  }

  std::stringstream removeIntegrityThreadHashesByKeysSQLStream;
  removeIntegrityThreadHashesByKeysSQLStream << "DELETE FROM integrity_store "
                                                "WHERE id IN "
                                             << getSQLStatementArray(ids.size())
                                             << ";";

  removeEntitiesByKeys(
      SQLiteQueryExecutor::getConnection(),
      removeIntegrityThreadHashesByKeysSQLStream.str(),
      ids);
}

std::vector<IntegrityThreadHash>
SQLiteQueryExecutor::getAllIntegrityThreadHashes() const {
  static std::string getAllIntegrityThreadHashesSQL =
      "SELECT * "
      "FROM integrity_store;";
  return getAllEntities<IntegrityThreadHash>(
      SQLiteQueryExecutor::getConnection(), getAllIntegrityThreadHashesSQL);
}

void SQLiteQueryExecutor::replaceSyncedMetadataEntry(
    const SyncedMetadataEntry &syncedMetadataEntry) const {
  static std::string replaceSyncedMetadataEntrySQL =
      "REPLACE INTO synced_metadata (name, data) "
      "VALUES (?, ?);";
  replaceEntity<SyncedMetadataEntry>(
      SQLiteQueryExecutor::getConnection(),
      replaceSyncedMetadataEntrySQL,
      syncedMetadataEntry);
}

void SQLiteQueryExecutor::removeAllSyncedMetadata() const {
  static std::string removeAllSyncedMetadataSQL =
      "DELETE FROM synced_metadata;";
  removeAllEntities(
      SQLiteQueryExecutor::getConnection(), removeAllSyncedMetadataSQL);
}

void SQLiteQueryExecutor::removeSyncedMetadata(
    const std::vector<std::string> &names) const {
  if (!names.size()) {
    return;
  }

  std::stringstream removeSyncedMetadataByNamesSQLStream;
  removeSyncedMetadataByNamesSQLStream << "DELETE FROM synced_metadata "
                                          "WHERE name IN "
                                       << getSQLStatementArray(names.size())
                                       << ";";

  removeEntitiesByKeys(
      SQLiteQueryExecutor::getConnection(),
      removeSyncedMetadataByNamesSQLStream.str(),
      names);
}

std::vector<SyncedMetadataEntry>
SQLiteQueryExecutor::getAllSyncedMetadata() const {
  static std::string getAllSyncedMetadataSQL =
      "SELECT * "
      "FROM synced_metadata;";
  return getAllEntities<SyncedMetadataEntry>(
      SQLiteQueryExecutor::getConnection(), getAllSyncedMetadataSQL);
}

std::optional<int>
SQLiteQueryExecutor::getSyncedDatabaseVersion(sqlite3 *db) const {
  static std::string getDBVersionSyncedMetadataSQL =
      "SELECT * "
      "FROM synced_metadata "
      "WHERE name=\"db_version\";";
  std::vector<SyncedMetadataEntry> entries =
      getAllEntities<SyncedMetadataEntry>(db, getDBVersionSyncedMetadataSQL);
  for (auto &entry : entries) {
    return std::stoi(entry.data);
  }
  return std::nullopt;
}

void SQLiteQueryExecutor::replaceAuxUserInfo(
    const AuxUserInfo &userInfo) const {
  static std::string replaceAuxUserInfoSQL =
      "REPLACE INTO aux_users (id, aux_user_info) "
      "VALUES (?, ?);";
  replaceEntity<AuxUserInfo>(
      SQLiteQueryExecutor::getConnection(), replaceAuxUserInfoSQL, userInfo);
}

void SQLiteQueryExecutor::removeAllAuxUserInfos() const {
  static std::string removeAllAuxUserInfosSQL = "DELETE FROM aux_users;";
  removeAllEntities(
      SQLiteQueryExecutor::getConnection(), removeAllAuxUserInfosSQL);
}

void SQLiteQueryExecutor::removeAuxUserInfos(
    const std::vector<std::string> &ids) const {
  if (!ids.size()) {
    return;
  }

  std::stringstream removeAuxUserInfosByKeysSQLStream;
  removeAuxUserInfosByKeysSQLStream << "DELETE FROM aux_users "
                                       "WHERE id IN "
                                    << getSQLStatementArray(ids.size()) << ";";

  removeEntitiesByKeys(
      SQLiteQueryExecutor::getConnection(),
      removeAuxUserInfosByKeysSQLStream.str(),
      ids);
}

std::vector<AuxUserInfo> SQLiteQueryExecutor::getAllAuxUserInfos() const {
  static std::string getAllAuxUserInfosSQL =
      "SELECT * "
      "FROM aux_users;";
  return getAllEntities<AuxUserInfo>(
      SQLiteQueryExecutor::getConnection(), getAllAuxUserInfosSQL);
}

void SQLiteQueryExecutor::replaceThreadActivityEntry(
    const ThreadActivityEntry &threadActivityEntry) const {
  static std::string replaceThreadActivityEntrySQL =
      "REPLACE INTO thread_activity (id, thread_activity_store_entry) "
      "VALUES (?, ?);";
  replaceEntity<ThreadActivityEntry>(
      SQLiteQueryExecutor::getConnection(),
      replaceThreadActivityEntrySQL,
      threadActivityEntry);
}

void SQLiteQueryExecutor::removeAllThreadActivityEntries() const {
  static std::string removeAllThreadActivityEntriesSQL =
      "DELETE FROM thread_activity;";
  removeAllEntities(
      SQLiteQueryExecutor::getConnection(), removeAllThreadActivityEntriesSQL);
}

void SQLiteQueryExecutor::removeThreadActivityEntries(
    const std::vector<std::string> &ids) const {
  if (!ids.size()) {
    return;
  }

  std::stringstream removeThreadActivityEntriesByKeysSQLStream;
  removeThreadActivityEntriesByKeysSQLStream << "DELETE FROM thread_activity "
                                                "WHERE id IN "
                                             << getSQLStatementArray(ids.size())
                                             << ";";

  removeEntitiesByKeys(
      SQLiteQueryExecutor::getConnection(),
      removeThreadActivityEntriesByKeysSQLStream.str(),
      ids);
}

std::vector<ThreadActivityEntry>
SQLiteQueryExecutor::getAllThreadActivityEntries() const {
  static std::string getAllThreadActivityEntriesSQL =
      "SELECT * "
      "FROM thread_activity;";
  return getAllEntities<ThreadActivityEntry>(
      SQLiteQueryExecutor::getConnection(), getAllThreadActivityEntriesSQL);
}

void SQLiteQueryExecutor::replaceEntry(const EntryInfo &entryInfo) const {
  static std::string replaceEntrySQL =
      "REPLACE INTO entries (id, entry) "
      "VALUES (?, ?);";
  replaceEntity<EntryInfo>(
      SQLiteQueryExecutor::getConnection(), replaceEntrySQL, entryInfo);
}

void SQLiteQueryExecutor::removeAllEntries() const {
  static std::string removeAllEntriesSQL = "DELETE FROM entries;";
  removeAllEntities(SQLiteQueryExecutor::getConnection(), removeAllEntriesSQL);
}

void SQLiteQueryExecutor::removeEntries(
    const std::vector<std::string> &ids) const {
  if (!ids.size()) {
    return;
  }

  std::stringstream removeEntriesByKeysSQLStream;
  removeEntriesByKeysSQLStream << "DELETE FROM entries "
                                  "WHERE id IN "
                               << getSQLStatementArray(ids.size()) << ";";
  removeEntitiesByKeys(
      SQLiteQueryExecutor::getConnection(),
      removeEntriesByKeysSQLStream.str(),
      ids);
}

std::vector<EntryInfo> SQLiteQueryExecutor::getAllEntries() const {
  static std::string getAllEntriesSQL =
      "SELECT * "
      "FROM entries;";
  return getAllEntities<EntryInfo>(
      SQLiteQueryExecutor::getConnection(), getAllEntriesSQL);
}

void SQLiteQueryExecutor::replaceMessageStoreLocalMessageInfo(
    const LocalMessageInfo &localMessageInfo) const {
  static std::string replaceLocalMessageInfoSQL =
      "REPLACE INTO message_store_local (id, local_message_info) "
      "VALUES (?, ?);";
  replaceEntity<LocalMessageInfo>(
      SQLiteQueryExecutor::getConnection(),
      replaceLocalMessageInfoSQL,
      localMessageInfo);
}

void SQLiteQueryExecutor::removeMessageStoreLocalMessageInfos(
    const std::vector<std::string> &ids) const {
  if (!ids.size()) {
    return;
  }

  std::stringstream removeLocalMessageInfosByKeysSQLStream;
  removeLocalMessageInfosByKeysSQLStream << "DELETE FROM message_store_local "
                                            "WHERE id IN "
                                         << getSQLStatementArray(ids.size())
                                         << ";";

  removeEntitiesByKeys(
      SQLiteQueryExecutor::getConnection(),
      removeLocalMessageInfosByKeysSQLStream.str(),
      ids);
}

void SQLiteQueryExecutor::removeAllMessageStoreLocalMessageInfos() const {
  static std::string removeAllLocalMessageInfosSQL =
      "DELETE FROM message_store_local;";
  removeAllEntities(
      SQLiteQueryExecutor::getConnection(), removeAllLocalMessageInfosSQL);
}

std::vector<LocalMessageInfo>
SQLiteQueryExecutor::getAllMessageStoreLocalMessageInfos() const {
  static std::string getAllLocalMessageInfosSQL =
      "SELECT * "
      "FROM message_store_local;";
  return getAllEntities<LocalMessageInfo>(
      SQLiteQueryExecutor::getConnection(), getAllLocalMessageInfosSQL);
}

void SQLiteQueryExecutor::beginTransaction() const {
  executeQuery(SQLiteQueryExecutor::getConnection(), "BEGIN TRANSACTION;");
}

void SQLiteQueryExecutor::commitTransaction() const {
  executeQuery(SQLiteQueryExecutor::getConnection(), "COMMIT;");
}

void SQLiteQueryExecutor::rollbackTransaction() const {
  executeQuery(SQLiteQueryExecutor::getConnection(), "ROLLBACK;");
}

int SQLiteQueryExecutor::getContentAccountID() const {
  return CONTENT_ACCOUNT_ID;
}

int SQLiteQueryExecutor::getNotifsAccountID() const {
  return NOTIFS_ACCOUNT_ID;
}

std::vector<OlmPersistSession>
SQLiteQueryExecutor::getOlmPersistSessionsData() const {
  static std::string getAllOlmPersistSessionsSQL =
      "SELECT * "
      "FROM olm_persist_sessions;";
  return getAllEntities<OlmPersistSession>(
      SQLiteQueryExecutor::getConnection(), getAllOlmPersistSessionsSQL);
}

std::optional<std::string>
SQLiteQueryExecutor::getOlmPersistAccountData(int accountID) const {
  static std::string getOlmPersistAccountSQL =
      "SELECT * "
      "FROM olm_persist_account "
      "WHERE id = ?;";
  std::unique_ptr<OlmPersistAccount> result =
      getEntityByIntegerPrimaryKey<OlmPersistAccount>(
          SQLiteQueryExecutor::getConnection(),
          getOlmPersistAccountSQL,
          accountID);
  if (result == nullptr) {
    return std::nullopt;
  }
  return result->account_data;
}

void SQLiteQueryExecutor::storeOlmPersistAccount(
    int accountID,
    const std::string &accountData) const {
  static std::string replaceOlmPersistAccountSQL =
      "REPLACE INTO olm_persist_account (id, account_data) "
      "VALUES (?, ?);";

  OlmPersistAccount persistAccount = {accountID, accountData};

  replaceEntity<OlmPersistAccount>(
      SQLiteQueryExecutor::getConnection(),
      replaceOlmPersistAccountSQL,
      persistAccount);
}

void SQLiteQueryExecutor::storeOlmPersistSession(
    const OlmPersistSession &session) const {
  static std::string replaceOlmPersistSessionSQL =
      "REPLACE INTO olm_persist_sessions "
      "(target_device_id, session_data, version) "
      "VALUES (?, ?, ?);";

  replaceEntity<OlmPersistSession>(
      SQLiteQueryExecutor::getConnection(),
      replaceOlmPersistSessionSQL,
      session);
}

void SQLiteQueryExecutor::storeOlmPersistData(
    int accountID,
    crypto::Persist persist) const {

  if (accountID != CONTENT_ACCOUNT_ID && persist.sessions.size() > 0) {
    std::string errorMessage{
        "Attempt to store notifications sessions in SQLite. Notifications "
        "sessions must be stored in storage shared with NSE"};
    Logger::log(errorMessage);
    throw std::runtime_error(errorMessage);
  }

  std::string accountData =
      std::string(persist.account.begin(), persist.account.end());
  this->storeOlmPersistAccount(accountID, accountData);

  for (auto it = persist.sessions.begin(); it != persist.sessions.end(); it++) {
    OlmPersistSession persistSession = {
        it->first,
        std::string(it->second.buffer.begin(), it->second.buffer.end()),
        it->second.version};

    this->storeOlmPersistSession(persistSession);
  }
}

void SQLiteQueryExecutor::stampSQLiteDBUserID(std::string userID) const {
  this->setMetadata("current_user_id", userID);
}

std::string SQLiteQueryExecutor::getSQLiteStampedUserID() const {
  return this->getMetadata("current_user_id");
}

void SQLiteQueryExecutor::setMetadata(std::string entryName, std::string data)
    const {
  std::string replaceMetadataSQL =
      "REPLACE INTO metadata (name, data) "
      "VALUES (?, ?);";
  Metadata entry{
      entryName,
      data,
  };
  replaceEntity<Metadata>(
      SQLiteQueryExecutor::getConnection(), replaceMetadataSQL, entry);
}

void SQLiteQueryExecutor::clearMetadata(std::string entryName) const {
  static std::string removeMetadataByKeySQL =
      "DELETE FROM metadata "
      "WHERE name IN (?);";
  std::vector<std::string> keys = {entryName};
  removeEntitiesByKeys(
      SQLiteQueryExecutor::getConnection(), removeMetadataByKeySQL, keys);
}

std::string SQLiteQueryExecutor::getMetadata(std::string entryName) const {
  std::string getMetadataByPrimaryKeySQL =
      "SELECT * "
      "FROM metadata "
      "WHERE name = ?;";
  std::unique_ptr<Metadata> entry = getEntityByPrimaryKey<Metadata>(
      SQLiteQueryExecutor::getConnection(),
      getMetadataByPrimaryKeySQL,
      entryName);
  return (entry == nullptr) ? "" : entry->data;
}

void SQLiteQueryExecutor::addOutboundP2PMessages(
    const std::vector<OutboundP2PMessage> &messages) const {
  static std::string addMessage =
      "REPLACE INTO outbound_p2p_messages ("
      " message_id, device_id, user_id, timestamp,"
      " plaintext, ciphertext, status, supports_auto_retry) "
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?);";

  for (const OutboundP2PMessage &clientMessage : messages) {
    SQLiteOutboundP2PMessage message =
        clientMessage.toSQLiteOutboundP2PMessage();
    replaceEntity<SQLiteOutboundP2PMessage>(
        SQLiteQueryExecutor::getConnection(), addMessage, message);
  }
}

std::vector<OutboundP2PMessage> SQLiteQueryExecutor::getOutboundP2PMessagesByID(
    const std::vector<std::string> &ids) const {
  std::stringstream getOutboundP2PMessageSQLStream;
  getOutboundP2PMessageSQLStream << "SELECT * "
                                    "FROM outbound_p2p_messages "
                                    "WHERE message_id IN "
                                 << getSQLStatementArray(ids.size()) << ";";
  std::string getOutboundP2PMessageSQL = getOutboundP2PMessageSQLStream.str();

  SQLiteStatementWrapper preparedSQL(
      SQLiteQueryExecutor::getConnection(),
      getOutboundP2PMessageSQL,
      "Failed to get outbound messages by ID");

  std::vector<SQLiteOutboundP2PMessage> queryResult =
      getAllEntitiesByPrimaryKeys<SQLiteOutboundP2PMessage>(
          SQLiteQueryExecutor::getConnection(), getOutboundP2PMessageSQL, ids);
  std::vector<OutboundP2PMessage> result;
  for (auto &message : queryResult) {
    result.emplace_back(OutboundP2PMessage(message));
  }
  return result;
}

std::vector<OutboundP2PMessage>
SQLiteQueryExecutor::getUnsentOutboundP2PMessages() const {
  std::string query =
      "SELECT * FROM outbound_p2p_messages "
      "WHERE status != 'sent' "
      "ORDER BY timestamp;";

  SQLiteStatementWrapper preparedSQL(
      SQLiteQueryExecutor::getConnection(),
      query,
      "Failed to get all messages to device");

  std::vector<OutboundP2PMessage> messages;
  for (int stepResult = sqlite3_step(preparedSQL); stepResult == SQLITE_ROW;
       stepResult = sqlite3_step(preparedSQL)) {
    messages.emplace_back(OutboundP2PMessage(
        SQLiteOutboundP2PMessage::fromSQLResult(preparedSQL, 0)));
  }

  return messages;
}

void SQLiteQueryExecutor::removeOutboundP2PMessage(
    std::string confirmedMessageID,
    std::string deviceID) const {
  std::string query =
      "DELETE FROM outbound_p2p_messages "
      "WHERE message_id = ? AND device_id = ?;";

  comm::SQLiteStatementWrapper preparedSQL(
      SQLiteQueryExecutor::getConnection(),
      query,
      "Failed to remove messages to device");

  bindStringToSQL(confirmedMessageID.c_str(), preparedSQL, 1);
  bindStringToSQL(deviceID.c_str(), preparedSQL, 2);

  sqlite3_step(preparedSQL);
}

void SQLiteQueryExecutor::removeAllOutboundP2PMessages(
    const std::string &deviceID) const {
  static std::string removeMessagesSQL =
      "DELETE FROM outbound_p2p_messages "
      "WHERE device_id IN (?);";
  std::vector<std::string> keys = {deviceID};
  removeEntitiesByKeys(
      SQLiteQueryExecutor::getConnection(), removeMessagesSQL, keys);
}

void SQLiteQueryExecutor::setCiphertextForOutboundP2PMessage(
    std::string messageID,
    std::string deviceID,
    std::string ciphertext) const {
  static std::string query =
      "UPDATE outbound_p2p_messages "
      "SET ciphertext = ?, status = 'encrypted' "
      "WHERE message_id = ? AND device_id = ?;";

  comm::SQLiteStatementWrapper preparedSQL(
      SQLiteQueryExecutor::getConnection(),
      query,
      "Failed to set ciphertext for OutboundP2PMessage");

  bindStringToSQL(ciphertext.c_str(), preparedSQL, 1);
  bindStringToSQL(messageID.c_str(), preparedSQL, 2);
  bindStringToSQL(deviceID.c_str(), preparedSQL, 3);

  sqlite3_step(preparedSQL);
}

void SQLiteQueryExecutor::markOutboundP2PMessageAsSent(
    std::string messageID,
    std::string deviceID) const {
  static std::string query =
      "UPDATE outbound_p2p_messages "
      "SET status = 'sent' "
      "WHERE message_id = ? AND device_id = ?;";

  comm::SQLiteStatementWrapper preparedSQL(
      SQLiteQueryExecutor::getConnection(),
      query,
      "Failed to mark OutboundP2PMessage as sent");

  bindStringToSQL(messageID.c_str(), preparedSQL, 1);
  bindStringToSQL(deviceID.c_str(), preparedSQL, 2);

  sqlite3_step(preparedSQL);
}

std::vector<std::string> SQLiteQueryExecutor::resetOutboundP2PMessagesForDevice(
    std::string deviceID) const {
  // Query all messages that need to be resent - all message that supports
  // auto retry or already sent messages.
  std::string queryMessageIDsToResend =
      "SELECT message_id "
      "FROM outbound_p2p_messages "
      "WHERE device_id = ? AND ( "
      "  supports_auto_retry = 1 "
      "  OR (supports_auto_retry = 0 AND status = 'sent') "
      ");";

  SQLiteStatementWrapper preparedQueryMessageIDsSQL(
      SQLiteQueryExecutor::getConnection(),
      queryMessageIDsToResend,
      "Failed to get all messages to reset");

  bindStringToSQL(deviceID.c_str(), preparedQueryMessageIDsSQL, 1);
  std::vector<std::string> messageIDs;
  for (int stepResult = sqlite3_step(preparedQueryMessageIDsSQL);
       stepResult == SQLITE_ROW;
       stepResult = sqlite3_step(preparedQueryMessageIDsSQL)) {
    messageIDs.push_back(getStringFromSQLRow(preparedQueryMessageIDsSQL, 0));
  }

  // Setting ciphertext to an empty string to make sure this message will be
  // encrypted again with a new session, update the status, and set
  // supports_auto_retry to true.
  // Updating supports_auto_retry to true because those are already sent
  // messages (from the UI perspective), but the recipient failed to decrypt
  // so needs to be automatically resent.
  std::stringstream resetMessagesSQLStream;
  resetMessagesSQLStream
      << "UPDATE outbound_p2p_messages "
      << "SET supports_auto_retry = 1, status = 'persisted', ciphertext = '' "
      << "WHERE message_id IN " << getSQLStatementArray(messageIDs.size())
      << ";";

  SQLiteStatementWrapper preparedUpdateSQL(
      SQLiteQueryExecutor::getConnection(),
      resetMessagesSQLStream.str(),
      "Failed to reset messages.");

  for (int i = 0; i < messageIDs.size(); i++) {
    int bindResult = bindStringToSQL(messageIDs[i], preparedUpdateSQL, i + 1);
    if (bindResult != SQLITE_OK) {
      std::stringstream error_message;
      error_message << "Failed to bind key to SQL statement. Details: "
                    << sqlite3_errstr(bindResult) << std::endl;
      sqlite3_finalize(preparedUpdateSQL);
      Logger::log(error_message.str());
      throw std::runtime_error(error_message.str());
    }
  }
  sqlite3_step(preparedUpdateSQL);

  // This handles the case of messages that are encrypted (with a malformed
  // session) but not yet queued on Tunnelbroker. In this case, this message
  // is not considered to be sent (from the UI perspective),
  // and supports_auto_retry is not updated.
  std::string updateCiphertextQuery =
      "UPDATE outbound_p2p_messages "
      "SET ciphertext = '', status = 'persisted'"
      "WHERE device_id = ? "
      "  AND supports_auto_retry = 0 "
      "  AND status = 'encrypted';";

  SQLiteStatementWrapper preparedUpdateCiphertextSQL(
      SQLiteQueryExecutor::getConnection(),
      updateCiphertextQuery,
      "Failed to set ciphertext");

  bindStringToSQL(deviceID.c_str(), preparedUpdateCiphertextSQL, 1);
  sqlite3_step(preparedUpdateCiphertextSQL);

  return messageIDs;
}

void SQLiteQueryExecutor::addInboundP2PMessage(
    InboundP2PMessage message) const {
  static std::string addMessage =
      "REPLACE INTO inbound_p2p_messages ("
      "  message_id, sender_device_id, plaintext, status, sender_user_id)"
      "VALUES (?, ?, ?, ?, ?);";

  replaceEntity<InboundP2PMessage>(
      SQLiteQueryExecutor::getConnection(), addMessage, message);
}

std::vector<InboundP2PMessage>
SQLiteQueryExecutor::getAllInboundP2PMessage() const {
  static std::string query =
      "SELECT message_id, sender_device_id, plaintext, status, sender_user_id "
      "FROM inbound_p2p_messages;";
  return getAllEntities<InboundP2PMessage>(
      SQLiteQueryExecutor::getConnection(), query);
}

void SQLiteQueryExecutor::removeInboundP2PMessages(
    const std::vector<std::string> &ids) const {
  if (!ids.size()) {
    return;
  }

  std::stringstream removeMessagesSQLStream;
  removeMessagesSQLStream << "DELETE FROM inbound_p2p_messages "
                             "WHERE message_id IN "
                          << getSQLStatementArray(ids.size()) << ";";

  removeEntitiesByKeys(
      SQLiteQueryExecutor::getConnection(), removeMessagesSQLStream.str(), ids);
}

std::vector<InboundP2PMessage> SQLiteQueryExecutor::getInboundP2PMessagesByID(
    const std::vector<std::string> &ids) const {
  std::stringstream getInboundP2PMessagesSQLStream;
  getInboundP2PMessagesSQLStream << "SELECT "
                                    "  message_id, sender_device_id, "
                                    "  plaintext, status, sender_user_id "
                                    "FROM inbound_p2p_messages "
                                    "WHERE message_id IN "
                                 << getSQLStatementArray(ids.size()) << ";";
  std::string getInboundP2PMessageSQL = getInboundP2PMessagesSQLStream.str();

  SQLiteStatementWrapper preparedSQL(
      SQLiteQueryExecutor::getConnection(),
      getInboundP2PMessageSQL,
      "Failed to get inbound messages by ID");

  return getAllEntitiesByPrimaryKeys<InboundP2PMessage>(
      SQLiteQueryExecutor::getConnection(), getInboundP2PMessageSQL, ids);
}

std::vector<MessageEntity>
SQLiteQueryExecutor::getRelatedMessages(const std::string &messageID) const {
  static std::string getMessageSQL =
      "SELECT "
      "  m.id, m.local_id, m.thread, m.user, m.type, m.future_type, "
      "  m.content, m.time, media.id, media.container, media.thread, "
      "  media.uri, media.type, media.extras "
      "FROM messages AS m "
      "LEFT JOIN media "
      "  ON m.id = media.container "
      "WHERE m.id = ? OR m.target_message = ? "
      "ORDER BY m.time DESC";
  comm::SQLiteStatementWrapper preparedSQL(
      SQLiteQueryExecutor::getConnection(),
      getMessageSQL,
      "Failed to get latest message edit");
  bindStringToSQL(messageID.c_str(), preparedSQL, 1);
  bindStringToSQL(messageID.c_str(), preparedSQL, 2);
  return this->processMessagesResults(preparedSQL);
}

std::vector<MessageEntity> SQLiteQueryExecutor::searchMessages(
    std::string query,
    std::string threadID,
    std::optional<std::string> timestampCursor,
    std::optional<std::string> messageIDCursor) const {
  std::stringstream searchMessagesSQL;
  searchMessagesSQL
      << "SELECT "
         "  m.id, m.local_id, m.thread, m.user, m.type, m.future_type, "
         "  m.content, m.time, media.id, media.container, media.thread, "
         "  media.uri, media.type, media.extras "
         "FROM message_search AS s "
         "LEFT JOIN messages AS m "
         "  ON m.id = s.original_message_id "
         "LEFT JOIN media "
         "  ON m.id = media.container "
         "LEFT JOIN messages AS m2 "
         "  ON m2.target_message = m.id "
         "  AND m2.type = ? AND m2.thread = ? "
         "WHERE s.processed_content MATCH ? "
         "  AND (m.thread = ? OR m2.id IS NOT NULL) ";

  bool usingCursor = timestampCursor.has_value() && messageIDCursor.has_value();

  if (usingCursor) {
    searchMessagesSQL << " AND (m.time < ? OR (m.time = ? AND m.id < ?)) ";
  }
  searchMessagesSQL << "ORDER BY m.time DESC, m.id DESC "
                    << "LIMIT 20;";

  comm::SQLiteStatementWrapper preparedSQL(
      SQLiteQueryExecutor::getConnection(),
      searchMessagesSQL.str(),
      "Failed to get message search results");

  auto sidebarSourceType = static_cast<int>(MessageType::SIDEBAR_SOURCE);

  bindIntToSQL(sidebarSourceType, preparedSQL, 1);
  bindStringToSQL(threadID.c_str(), preparedSQL, 2);
  bindStringToSQL(query.c_str(), preparedSQL, 3);
  bindStringToSQL(threadID.c_str(), preparedSQL, 4);

  if (usingCursor) {
    int64_t timestamp = std::stoll(timestampCursor.value());
    bindInt64ToSQL(timestamp, preparedSQL, 5);
    bindInt64ToSQL(timestamp, preparedSQL, 6);
    bindStringToSQL(messageIDCursor.value(), preparedSQL, 7);
  }

  std::vector<MessageEntity> messages =
      this->processMessagesResults(preparedSQL);
  std::vector<std::string> messageIDs;
  for (const auto &message : messages) {
    messageIDs.push_back(message.first.id);
  }
  std::vector<MessageEntity> relatedMessages =
      this->getRelatedMessagesForSearch(messageIDs);

  for (auto &entity : relatedMessages) {
    messages.push_back(std::move(entity));
  }
  return messages;
}

std::vector<MessageEntity> SQLiteQueryExecutor::getRelatedMessagesForSearch(
    const std::vector<std::string> &messageIDs) const {
  std::stringstream selectRelatedMessagesSQLStream;
  selectRelatedMessagesSQLStream << "SELECT "
                                    "  m.id, m.local_id, m.thread, m.user, "
                                    "  m.type, m.future_type, m.content, "
                                    "  m.time, media.id, media.container, "
                                    "  media.thread, media.uri, media.type, "
                                    "  media.extras "
                                    "FROM messages AS m "
                                    "LEFT JOIN media "
                                    "  ON m.id = media.container "
                                    "WHERE m.target_message IN "
                                 << getSQLStatementArray(messageIDs.size())
                                 << "ORDER BY m.time DESC";

  std::string selectRelatedMessagesSQL = selectRelatedMessagesSQLStream.str();

  SQLiteStatementWrapper preparedSQL(
      SQLiteQueryExecutor::getConnection(),
      selectRelatedMessagesSQL,
      "Failed to fetch related messages.");

  for (int i = 0; i < messageIDs.size(); i++) {
    int bindResult = bindStringToSQL(messageIDs[i], preparedSQL, i + 1);
    if (bindResult != SQLITE_OK) {
      std::stringstream error_message;
      error_message << "Failed to bind key to SQL statement. Details: "
                    << sqlite3_errstr(bindResult) << std::endl;
      sqlite3_finalize(preparedSQL);
      Logger::log(error_message.str());
      throw std::runtime_error(error_message.str());
    }
  }

  return this->processMessagesResults(preparedSQL);
}

void SQLiteQueryExecutor::replaceDMOperation(
    const DMOperation &operation) const {
  static std::string query =
      "REPLACE INTO dm_operations (id, type, operation) "
      "VALUES (?, ?, ?);";
  replaceEntity<DMOperation>(
      SQLiteQueryExecutor::getConnection(), query, operation);
}

void SQLiteQueryExecutor::removeAllDMOperations() const {
  static std::string query = "DELETE FROM dm_operations;";
  removeAllEntities(SQLiteQueryExecutor::getConnection(), query);
}

void SQLiteQueryExecutor::removeDMOperations(
    const std::vector<std::string> &ids) const {
  if (!ids.size()) {
    return;
  }

  std::stringstream queryStream;
  queryStream << "DELETE FROM dm_operations "
                 "WHERE id IN "
              << getSQLStatementArray(ids.size()) << ";";
  removeEntitiesByKeys(
      SQLiteQueryExecutor::getConnection(), queryStream.str(), ids);
}

std::vector<DMOperation> SQLiteQueryExecutor::getDMOperations() const {
  static std::string query =
      "SELECT id, type, operation "
      "FROM dm_operations;";
  return getAllEntities<DMOperation>(
      SQLiteQueryExecutor::getConnection(), query);
}

std::vector<DMOperation> SQLiteQueryExecutor::getDMOperationsByType(
    const std::string &operationType) const {
  static std::string query =
      "SELECT id, type, operation "
      "FROM dm_operations "
      "WHERE type = ?;";

  std::vector<std::string> types{operationType};
  return getAllEntitiesByPrimaryKeys<DMOperation>(
      SQLiteQueryExecutor::getConnection(), query, types);
}

std::vector<std::string>
SQLiteQueryExecutor::getAllTableNames(sqlite3 *db) const {
  std::vector<std::string> tableNames;

  std::string getAllTablesQuery =
      "SELECT name "
      "FROM sqlite_master"
      "WHERE type='table';";

  sqlite3_stmt *stmt;
  sqlite3_prepare_v2(db, getAllTablesQuery.c_str(), -1, &stmt, nullptr);
  while (sqlite3_step(stmt) == SQLITE_ROW) {
    const unsigned char *text = sqlite3_column_text(stmt, 0);
    if (text) {
      tableNames.push_back(reinterpret_cast<const char *>(text));
    }
  }
  sqlite3_finalize(stmt);

  return tableNames;
}

#ifdef EMSCRIPTEN
std::vector<WebThread> SQLiteQueryExecutor::getAllThreadsWeb() const {
  auto threads = this->getAllThreads();
  std::vector<WebThread> webThreads;
  webThreads.reserve(threads.size());
  for (const auto &thread : threads) {
    webThreads.emplace_back(thread);
  }
  return webThreads;
};

void SQLiteQueryExecutor::replaceThreadWeb(const WebThread &thread) const {
  this->replaceThread(thread.toThread());
};

std::vector<MessageWithMedias> SQLiteQueryExecutor::transformToWebMessages(
    const std::vector<MessageEntity> &messages) const {
  std::vector<MessageWithMedias> messageWithMedias;
  for (auto &messageWithMedia : messages) {
    messageWithMedias.push_back(
        {std::move(messageWithMedia.first), messageWithMedia.second});
  }

  return messageWithMedias;
}

std::vector<MessageWithMedias>
SQLiteQueryExecutor::getInitialMessagesWeb() const {
  auto messages = this->getInitialMessages();
  return this->transformToWebMessages(messages);
}

std::vector<MessageWithMedias> SQLiteQueryExecutor::fetchMessagesWeb(
    std::string threadID,
    int limit,
    int offset) const {
  auto messages = this->fetchMessages(threadID, limit, offset);
  return this->transformToWebMessages(messages);
}

void SQLiteQueryExecutor::replaceMessageWeb(const WebMessage &message) const {
  this->replaceMessage(message.toMessage());
};

NullableString
SQLiteQueryExecutor::getOlmPersistAccountDataWeb(int accountID) const {
  std::optional<std::string> accountData =
      this->getOlmPersistAccountData(accountID);
  if (!accountData.has_value()) {
    return NullableString();
  }
  return std::make_unique<std::string>(accountData.value());
}

std::vector<MessageWithMedias>
SQLiteQueryExecutor::getRelatedMessagesWeb(const std::string &messageID) const {
  auto relatedMessages = this->getRelatedMessages(messageID);
  return this->transformToWebMessages(relatedMessages);
}

std::vector<MessageWithMedias> SQLiteQueryExecutor::searchMessagesWeb(
    std::string query,
    std::string threadID,
    std::optional<std::string> timestampCursor,
    std::optional<std::string> messageIDCursor) const {
  auto messages =
      this->searchMessages(query, threadID, timestampCursor, messageIDCursor);
  return this->transformToWebMessages(messages);
}
#else
void SQLiteQueryExecutor::clearSensitiveData() {
  SQLiteQueryExecutor::closeConnection();
  if (SQLiteUtils::fileExists(SQLiteQueryExecutor::sqliteFilePath) &&
      std::remove(SQLiteQueryExecutor::sqliteFilePath.c_str())) {
    std::ostringstream errorStream;
    errorStream << "Failed to delete database file. Details: "
                << strerror(errno);
    Logger::log(errorStream.str());
    throw std::system_error(errno, std::generic_category(), errorStream.str());
  }
  SQLiteQueryExecutor::generateBackupDataKey();
  SQLiteQueryExecutor::migrate();
}

void SQLiteQueryExecutor::initialize(std::string &databasePath) {
  std::call_once(SQLiteQueryExecutor::initialized, [&databasePath]() {
    SQLiteQueryExecutor::sqliteFilePath = databasePath;
    folly::Optional<std::string> maybeBackupDataKey =
        CommSecureStore::get(CommSecureStore::backupDataKey);
    folly::Optional<std::string> maybeBackupLogDataKey =
        CommSecureStore::get(CommSecureStore::backupLogDataKey);

    if (SQLiteUtils::fileExists(databasePath) && maybeBackupDataKey &&
        maybeBackupLogDataKey) {
      SQLiteQueryExecutor::backupDataKey = maybeBackupDataKey.value();
      SQLiteQueryExecutor::backupLogDataKey = maybeBackupLogDataKey.value();
      return;
    } else if (SQLiteUtils::fileExists(databasePath) && maybeBackupDataKey) {
      SQLiteQueryExecutor::backupDataKey = maybeBackupDataKey.value();
      SQLiteQueryExecutor::generateBackupLogDataKey();
      return;
    }
    SQLiteQueryExecutor::generateBackupDataKey();
  });
}

void SQLiteQueryExecutor::initializeTablesForLogMonitoring() {
  sqlite3 *db;
  sqlite3_open(SQLiteQueryExecutor::sqliteFilePath.c_str(), &db);
  default_on_db_open_callback(db);

  std::vector<std::string> tablesToMonitor;
  {
    SQLiteStatementWrapper preparedSQL(
        db,
        "SELECT name FROM sqlite_master WHERE type='table';",
        "Failed to get all database tables");

    for (int stepResult = sqlite3_step(preparedSQL); stepResult == SQLITE_ROW;
         stepResult = sqlite3_step(preparedSQL)) {
      std::string table_name =
          reinterpret_cast<const char *>(sqlite3_column_text(preparedSQL, 0));
      if (SQLiteQueryExecutor::backedUpTablesAllowlist.find(table_name) !=
          SQLiteQueryExecutor::backedUpTablesAllowlist.end()) {
        tablesToMonitor.emplace_back(table_name);
      }
    }
    // Runs preparedSQL destructor which finalizes the sqlite statement
  }
  sqlite3_close(db);

  SQLiteQueryExecutor::connectionManager.tablesToMonitor = tablesToMonitor;
}

void SQLiteQueryExecutor::cleanupDatabaseExceptAllowlist(sqlite3 *db) const {
  std::vector<std::string> tables = getAllTableNames(db);

  std::ostringstream removeDeviceSpecificDataSQL;
  for (const auto &tableName : tables) {
    if (backedUpTablesAllowlist.find(tableName) ==
        backedUpTablesAllowlist.end()) {
      removeDeviceSpecificDataSQL << "DELETE FROM " << tableName << ";"
                                  << std::endl;
    }
  }

  std::string sqlQuery = removeDeviceSpecificDataSQL.str();
  if (!sqlQuery.empty()) {
    executeQuery(db, sqlQuery);
  }
}

void SQLiteQueryExecutor::createMainCompaction(std::string backupID) const {
  std::string finalBackupPath =
      PlatformSpecificTools::getBackupFilePath(backupID, false);
  std::string finalAttachmentsPath =
      PlatformSpecificTools::getBackupFilePath(backupID, true);

  std::string tempBackupPath = finalBackupPath + "_tmp";
  std::string tempAttachmentsPath = finalAttachmentsPath + "_tmp";

  if (SQLiteUtils::fileExists(tempBackupPath)) {
    Logger::log(
        "Attempting to delete temporary backup file from previous backup "
        "attempt.");
    SQLiteUtils::attemptDeleteFile(
        tempBackupPath,
        "Failed to delete temporary backup file from previous backup "
        "attempt.");
  }

  if (SQLiteUtils::fileExists(tempAttachmentsPath)) {
    Logger::log(
        "Attempting to delete temporary attachments file from previous "
        "backup "
        "attempt.");
    SQLiteUtils::attemptDeleteFile(
        tempAttachmentsPath,
        "Failed to delete temporary attachments file from previous backup "
        "attempt.");
  }

  sqlite3 *backupDB;
  sqlite3_open(tempBackupPath.c_str(), &backupDB);
  SQLiteUtils::setEncryptionKey(backupDB, SQLiteQueryExecutor::backupDataKey);

  sqlite3_backup *backupObj = sqlite3_backup_init(
      backupDB, "main", SQLiteQueryExecutor::getConnection(), "main");
  if (!backupObj) {
    std::stringstream error_message;
    error_message << "Failed to init backup for main compaction. Details: "
                  << sqlite3_errmsg(backupDB) << std::endl;
    sqlite3_close(backupDB);
    Logger::log(error_message.str());
    throw std::runtime_error(error_message.str());
  }

  int backupResult = sqlite3_backup_step(backupObj, -1);
  sqlite3_backup_finish(backupObj);
  if (backupResult == SQLITE_BUSY || backupResult == SQLITE_LOCKED) {
    sqlite3_close(backupDB);
    throw std::runtime_error(
        "Programmer error. Database in transaction during backup attempt.");
  } else if (backupResult != SQLITE_DONE) {
    sqlite3_close(backupDB);
    std::stringstream error_message;
    error_message << "Failed to create database backup. Details: "
                  << sqlite3_errstr(backupResult);
    Logger::log(error_message.str());
    throw std::runtime_error(error_message.str());
  }

  cleanupDatabaseExceptAllowlist(backupDB);
  executeQuery(backupDB, "VACUUM;");
  sqlite3_close(backupDB);

  SQLiteUtils::attemptRenameFile(
      tempBackupPath,
      finalBackupPath,
      "Failed to rename complete temporary backup file to final backup "
      "file.");

  std::ofstream tempAttachmentsFile(tempAttachmentsPath);
  if (!tempAttachmentsFile.is_open()) {
    std::string errorMessage{
        "Unable to create attachments file for backup id: " + backupID};
    Logger::log(errorMessage);
    throw std::runtime_error(errorMessage);
  }

  std::string getAllBlobServiceMediaSQL =
      "SELECT * FROM media WHERE uri LIKE 'comm-blob-service://%';";
  std::vector<Media> blobServiceMedia = getAllEntities<Media>(
      SQLiteQueryExecutor::getConnection(), getAllBlobServiceMediaSQL);

  for (const auto &media : blobServiceMedia) {
    std::string blobServiceURI = media.uri;
    std::string blobHash =
        SQLiteUtils::blobHashFromBlobServiceURI(blobServiceURI);
    tempAttachmentsFile << blobHash << "\n";
  }
  tempAttachmentsFile.close();

  SQLiteUtils::attemptRenameFile(
      tempAttachmentsPath,
      finalAttachmentsPath,
      "Failed to rename complete temporary attachments file to final "
      "attachments file.");

  this->setMetadata("backupID", backupID);
  this->clearMetadata("logID");
  if (ServicesUtils::fullBackupSupport) {
    SQLiteQueryExecutor::connectionManager.setLogsMonitoring(true);
  }
}

void SQLiteQueryExecutor::generateBackupDataKey() {
  std::string backupDataKey = comm::crypto::Tools::generateRandomHexString(
      SQLiteQueryExecutor::backupDataKeySize);
  CommSecureStore::set(CommSecureStore::backupDataKey, backupDataKey);
  SQLiteQueryExecutor::backupDataKey = backupDataKey;
  SQLiteQueryExecutor::generateBackupLogDataKey();
}

void SQLiteQueryExecutor::generateBackupLogDataKey() {
  std::string backupLogDataKey = comm::crypto::Tools::generateRandomHexString(
      SQLiteQueryExecutor::backupLogDataKeySize);
  CommSecureStore::set(CommSecureStore::backupLogDataKey, backupLogDataKey);
  SQLiteQueryExecutor::backupLogDataKey = backupLogDataKey;
}

void SQLiteQueryExecutor::captureBackupLogs() const {
  if (!ServicesUtils::fullBackupSupport) {
    return;
  }
  std::string backupID = this->getMetadata("backupID");
  if (!backupID.size()) {
    return;
  }

  std::string logID = this->getMetadata("logID");
  if (!logID.size()) {
    logID = "1";
  }

  bool newLogCreated = SQLiteQueryExecutor::connectionManager.captureLogs(
      backupID, logID, SQLiteQueryExecutor::backupLogDataKey);
  if (!newLogCreated) {
    return;
  }
  this->setMetadata("logID", std::to_string(std::stoi(logID) + 1));
}

void SQLiteQueryExecutor::triggerBackupFileUpload() const {
  if (!ServicesUtils::fullBackupSupport) {
    return;
  }
  ::triggerBackupFileUpload();
}

void SQLiteQueryExecutor::setUserDataKeys(
    const std::string &backupDataKey,
    const std::string &backupLogDataKey) const {
  if (SQLiteQueryExecutor::backupDataKey.empty()) {
    throw std::runtime_error("backupDataKey is not set");
  }

  if (SQLiteQueryExecutor::backupLogDataKey.empty()) {
    throw std::runtime_error("invalid backupLogDataKey size");
  }

  if (backupDataKey.size() != SQLiteQueryExecutor::backupDataKeySize) {
    throw std::runtime_error("invalid backupDataKey size");
  }

  if (backupLogDataKey.size() != SQLiteQueryExecutor::backupLogDataKeySize) {
    throw std::runtime_error("invalid backupLogDataKey size");
  }

  std::string rekey_encryption_key_query =
      "PRAGMA rekey = \"x'" + backupDataKey + "'\";";

  executeQuery(
      SQLiteQueryExecutor::getConnection(), rekey_encryption_key_query);

  CommSecureStore::set(CommSecureStore::backupDataKey, backupDataKey);
  SQLiteQueryExecutor::backupDataKey = backupDataKey;

  CommSecureStore::set(CommSecureStore::backupLogDataKey, backupLogDataKey);
  SQLiteQueryExecutor::backupLogDataKey = backupLogDataKey;
}
#endif

void SQLiteQueryExecutor::copyTablesDataUsingAttach(
    sqlite3 *db,
    const std::string &sourceDbPath,
    const std::vector<std::string> &tableNames) const {
  if (!SQLiteUtils::fileExists(sourceDbPath)) {
    std::stringstream errorMessage;
    errorMessage << "Error: File does not exist at path: " << sourceDbPath
                 << std::endl;
    Logger::log(errorMessage.str());
    throw std::runtime_error(errorMessage.str());
  }

  std::ostringstream sql;
  sql << "ATTACH DATABASE '" << sourceDbPath << "' AS sourceDB KEY '';";
  for (const auto &tableName : tableNames) {
    sql << "INSERT OR IGNORE INTO " << tableName << " SELECT *"
        << " FROM sourceDB." << tableName << ";" << std::endl;
  }
  sql << "DETACH DATABASE sourceDB;";
  executeQuery(db, sql.str());
}

void SQLiteQueryExecutor::restoreFromMainCompaction(
    std::string mainCompactionPath,
    std::string mainCompactionEncryptionKey,
    std::string maxVersion) const {

  if (!SQLiteUtils::fileExists(mainCompactionPath)) {
    std::string errorMessage{"Restore attempt but backup file does not exist"};
    Logger::log(errorMessage);
    throw std::runtime_error(errorMessage);
  }

  sqlite3 *backupDB;
  if (!SQLiteUtils::isDatabaseQueryable(
          backupDB, true, mainCompactionPath, mainCompactionEncryptionKey)) {
    std::string errorMessage{"Backup file or encryption key corrupted"};
    Logger::log(errorMessage);
    throw std::runtime_error(errorMessage);
  }

  std::string plaintextBackupPath = mainCompactionPath + "_plaintext";
  if (SQLiteUtils::fileExists(plaintextBackupPath)) {
    SQLiteUtils::attemptDeleteFile(
        plaintextBackupPath,
        "Failed to delete plaintext backup file from previous backup "
        "attempt.");
  }

  sqlite3_open(mainCompactionPath.c_str(), &backupDB);
  std::string plaintextMigrationDBQuery = "PRAGMA key = \"x'" +
      mainCompactionEncryptionKey +
      "'\";"
      "ATTACH DATABASE '" +
      plaintextBackupPath +
      "' AS plaintext KEY '';"
      "SELECT sqlcipher_export('plaintext');"
      "DETACH DATABASE plaintext;";
  executeQuery(backupDB, plaintextMigrationDBQuery);
  sqlite3_close(backupDB);

  sqlite3_open(plaintextBackupPath.c_str(), &backupDB);

  int version = this->getSyncedDatabaseVersion(backupDB).value_or(-1);
  if (version > std::stoi(maxVersion)) {
    std::stringstream error_message;
    error_message << "Failed to restore a backup because it was created "
                  << "with version " << version
                  << " that is newer than the max supported version "
                  << maxVersion << std::endl;
    sqlite3_close(backupDB);
    Logger::log(error_message.str());
    throw std::runtime_error(error_message.str());
  }

  std::vector<std::string> tablesVector(
      SQLiteQueryExecutor::backedUpTablesAllowlist.begin(),
      SQLiteQueryExecutor::backedUpTablesAllowlist.end());
  copyTablesDataUsingAttach(
      SQLiteQueryExecutor::getConnection(), plaintextBackupPath, tablesVector);

  SQLiteUtils::attemptDeleteFile(
      plaintextBackupPath,
      "Failed to delete plaintext compaction file after successful restore.");

  SQLiteUtils::attemptDeleteFile(
      mainCompactionPath,
      "Failed to delete main compaction file after successful restore.");
}

void SQLiteQueryExecutor::restoreFromBackupLog(
    const std::vector<std::uint8_t> &backupLog) const {
  SQLiteQueryExecutor::connectionManager.restoreFromBackupLog(backupLog);
}

} // namespace comm
