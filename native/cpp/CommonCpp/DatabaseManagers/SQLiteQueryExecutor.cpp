#include "SQLiteQueryExecutor.h"
#include "Logger.h"
#include "SQLiteBackup.h"
#include "SQLiteConnectionManager.h"
#include "SQLiteSchema.h"
#include "SQLiteUtils.h"
#include "WebSQLiteConnectionManager.h"

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

const int CONTENT_ACCOUNT_ID = 1;
const int NOTIFS_ACCOUNT_ID = 2;

namespace comm {

void SQLiteQueryExecutor::migrate() const {
  this->connectionManager->validateEncryption();

  std::stringstream db_path;
  db_path << "db path: " << this->connectionManager->getSQLiteFilePath()
          << std::endl;
  Logger::log(db_path.str());

  sqlite3 *db = this->connectionManager->getEphemeralConnection();

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

  SQLiteSchema::migrate(db);
  sqlite3_close(db);
}

SQLiteQueryExecutor::SQLiteQueryExecutor(
    std::shared_ptr<SQLiteConnectionManager> connectionManager,
    bool skipMigration)
    : connectionManager(std::move(connectionManager)) {
  if (!skipMigration) {
    this->migrate();
  }
}

SQLiteQueryExecutor::SQLiteQueryExecutor(
    std::string sqliteFilePath,
    bool skipMigration)
    : connectionManager(
          std::make_shared<WebSQLiteConnectionManager>(sqliteFilePath)) {
  if (!skipMigration) {
    this->migrate();
  }
}

sqlite3 *SQLiteQueryExecutor::getConnection() const {
  this->connectionManager->initializeConnection();
  return this->connectionManager->getConnection();
}

// This logic is crucial for managing the connectionManager's lifecycle within
// the SQLiteQueryExecutor. For newly instantiated connectionManagers, their
// lifecycle aligns with SQLiteQueryExecutor they belong to, and they are
// disposed of simultaneously. When using an existing connectionManager (such as
// NativeSQLiteConnectionManager from a static context like DatabaseManager),
// handling the destruction is more complex. connectionManager does not get
// destructed until the application exits (static member). There is no mechanism
// to automatically detect when all thread_local instances of
// SQLiteQueryExecutor are done, as their lifecycle is tied to thread execution,
// not directly managed through code. This code ensures that all active
// connections are closed once their corresponding threads have finished. This
// is crucial to prevent leftover issues like database file locks if the
// application is stopped unexpectedly and then run again. In
// `SQLiteQueryExecutor`, when a connection is needed, we always use the
// internal `getConnection`, which lazy-initializes the connection after it was
// closed by another instance whose thread is no longer alive.
SQLiteQueryExecutor::~SQLiteQueryExecutor() {
  this->connectionManager->closeConnection();
}

std::string SQLiteQueryExecutor::getDraft(std::string key) const {
  static std::string getDraftByPrimaryKeySQL =
      "SELECT * "
      "FROM drafts "
      "WHERE key = ?;";
  std::unique_ptr<Draft> draft = getEntityByPrimaryKey<Draft>(
      this->getConnection(), getDraftByPrimaryKeySQL, key);
  return (draft == nullptr) ? "" : draft->text;
}

std::unique_ptr<Thread>
SQLiteQueryExecutor::getThread(std::string threadID) const {
  static std::string getThreadByPrimaryKeySQL =
      "SELECT * "
      "FROM threads "
      "WHERE id = ?;";
  return getEntityByPrimaryKey<Thread>(
      this->getConnection(), getThreadByPrimaryKeySQL, threadID);
}

void SQLiteQueryExecutor::updateDraft(std::string key, std::string text) const {
  static std::string replaceDraftSQL =
      "REPLACE INTO drafts (key, text) "
      "VALUES (?, ?);";
  Draft draft = {key, text};
  replaceEntity<Draft>(this->getConnection(), replaceDraftSQL, draft);
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
  rekeyAllEntities(this->getConnection(), rekeyDraftSQL, oldKey, newKey);
  return true;
}

std::vector<Draft> SQLiteQueryExecutor::getAllDrafts() const {
  static std::string getAllDraftsSQL =
      "SELECT * "
      "FROM drafts;";
  return getAllEntities<Draft>(this->getConnection(), getAllDraftsSQL);
}

void SQLiteQueryExecutor::removeAllDrafts() const {
  static std::string removeAllDraftsSQL = "DELETE FROM drafts;";
  removeAllEntities(this->getConnection(), removeAllDraftsSQL);
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
      this->getConnection(), removeDraftsByKeysSQLStream.str(), ids);
}

void SQLiteQueryExecutor::removeAllMessages() const {
  static std::string removeAllMessagesSQL = "DELETE FROM messages;";
  removeAllEntities(this->getConnection(), removeAllMessagesSQL);

  static std::string removeAllBackupMessagesSQL =
      "DELETE FROM backup_messages;";
  removeAllEntities(this->getConnection(), removeAllBackupMessagesSQL);
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
      "  s.content, s.time, media.id, media.container, media.thread, "
      "  media.uri, media.type, media.extras "
      "FROM messages AS s "
      "LEFT JOIN media "
      "  ON s.id = media.container "
      "INNER JOIN threads AS t "
      "  ON s.thread = t.id "
      "UNION "
      "SELECT "
      "  s.id, s.local_id, s.thread, s.user, s.type, s.future_type, "
      "  s.content, s.time, backup_media.id, backup_media.container, "
      "  backup_media.thread, backup_media.uri, backup_media.type, "
      "  backup_media.extras "
      "FROM ( "
      "  SELECT "
      "    m.*, "
      "    ROW_NUMBER() OVER ( "
      "      PARTITION BY thread ORDER BY m.time DESC, m.id DESC "
      "    ) AS r "
      "  FROM backup_messages AS m "
      ") AS s "
      "LEFT JOIN backup_media "
      "  ON s.id = backup_media.container "
      "INNER JOIN backup_threads AS t "
      "  ON s.thread = t.id "
      "WHERE s.r <= 20 "
      "ORDER BY s.time, s.id;";

  SQLiteStatementWrapper preparedSQL(
      this->getConnection(),
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
      "WHERE m.thread = :thread "
      "UNION "
      "SELECT "
      "  m.id, m.local_id, m.thread, m.user, m.type, m.future_type, "
      "  m.content, m.time, backup_media.id, backup_media.container, "
      "  backup_media.thread, backup_media.uri, backup_media.type, "
      "  backup_media.extras "
      "FROM backup_messages AS m "
      "LEFT JOIN backup_media "
      "  ON m.id = backup_media.container "
      "WHERE m.thread = :thread "
      "ORDER BY m.time DESC, m.id DESC "
      "LIMIT :limit OFFSET :offset;";
  SQLiteStatementWrapper preparedSQL(
      this->getConnection(), query, "Failed to fetch messages.");

  int thread_index = sqlite3_bind_parameter_index(preparedSQL, ":thread");
  bindStringToSQL(threadID.c_str(), preparedSQL, thread_index);
  int limit_index = sqlite3_bind_parameter_index(preparedSQL, ":limit");
  bindIntToSQL(limit, preparedSQL, limit_index);
  int offset_index = sqlite3_bind_parameter_index(preparedSQL, ":offset");
  bindIntToSQL(offset, preparedSQL, offset_index);

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
      messages.back().medias.push_back(Media::fromSQLResult(preparedSQL, 8));
    } else {
      prevMsgIdx = message.id;
      std::vector<Media> mediaForMsg;
      if (sqlite3_column_type(preparedSQL, 8) != SQLITE_NULL) {
        mediaForMsg.push_back(Media::fromSQLResult(preparedSQL, 8));
      }
      MessageEntity entity;
      entity.message = std::move(message);
      entity.medias = std::move(mediaForMsg);
      messages.push_back(std::move(entity));
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
      this->getConnection(), removeMessagesByKeysSQLStream.str(), ids);

  std::stringstream removeBackupMessagesByKeysSQLStream;
  removeBackupMessagesByKeysSQLStream << "DELETE FROM backup_messages "
                                         "WHERE id IN "
                                      << getSQLStatementArray(ids.size())
                                      << ";";
  removeEntitiesByKeys(
      this->getConnection(), removeBackupMessagesByKeysSQLStream.str(), ids);
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
      this->getConnection(), removeMessagesByKeysSQLStream.str(), threadIDs);

  std::stringstream removeBackupMessagesByKeysSQLStream;
  removeBackupMessagesByKeysSQLStream << "DELETE FROM backup_messages "
                                         "WHERE thread IN "
                                      << getSQLStatementArray(threadIDs.size())
                                      << ";";

  removeEntitiesByKeys(
      this->getConnection(),
      removeBackupMessagesByKeysSQLStream.str(),
      threadIDs);
}

void SQLiteQueryExecutor::replaceMessage(
    const Message &message,
    bool backupItem) const {
  int sidebarSourceTypeInt = static_cast<int>(MessageType::SIDEBAR_SOURCE);
  std::string sidebarSourceType = std::to_string(sidebarSourceTypeInt);

  std::string tableName = backupItem ? "backup_messages" : "messages";
  std::string replaceMessageSQL = "REPLACE INTO " + tableName +
      "("
      "  id, local_id, thread, user, type, future_type, content, time, "
      "  target_message"
      ")"
      "VALUES ( "
      "  :id, :local_id, :thread, :user, :type, :future_type, :content, :time,"
      "  IIF("
      "    JSON_VALID(:content),"
      "    COALESCE("
      "      JSON_EXTRACT(:content, '$.targetMessageID'),"
      "      IIF("
      "        :type = " +
      sidebarSourceType +
      ","
      "        JSON_EXTRACT(:content, '$.id'),"
      "        NULL"
      "      )"
      "    ),"
      "    NULL"
      "  )"
      ");";

  replaceEntity<Message>(this->getConnection(), replaceMessageSQL, message);
}

void SQLiteQueryExecutor::updateMessageSearchIndex(
    std::string originalMessageID,
    std::string messageID,
    std::string processedContent) const {

  sqlite3 *db = this->getConnection();
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

void SQLiteQueryExecutor::deleteMessageFromSearchIndex(
    std::string messageID) const {
  std::vector<std::string> ids{messageID};
  std::stringstream queryStream;
  queryStream << "DELETE FROM message_search "
                 "WHERE original_message_id IN "
              << getSQLStatementArray(ids.size()) << ";";
  removeEntitiesByKeys(this->getConnection(), queryStream.str(), ids);
}

void SQLiteQueryExecutor::rekeyMessage(std::string from, std::string to) const {
  static std::string rekeyMessageSQL =
      "UPDATE OR REPLACE messages "
      "SET id = ? "
      "WHERE id = ?";
  rekeyAllEntities(this->getConnection(), rekeyMessageSQL, from, to);

  static std::string rekeyBackupMessageSQL =
      "UPDATE OR REPLACE backup_messages "
      "SET id = ? "
      "WHERE id = ?";
  rekeyAllEntities(this->getConnection(), rekeyBackupMessageSQL, from, to);
}

void SQLiteQueryExecutor::removeAllMedia() const {
  static std::string removeAllMediaSQL = "DELETE FROM media;";
  removeAllEntities(this->getConnection(), removeAllMediaSQL);

  static std::string removeAllBackupMediaSQL = "DELETE FROM backup_media;";
  removeAllEntities(this->getConnection(), removeAllBackupMediaSQL);
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
      this->getConnection(), removeMediaByKeysSQLStream.str(), msgIDs);

  std::stringstream removeBackupMediaByKeysSQLStream;
  removeBackupMediaByKeysSQLStream << "DELETE FROM backup_media "
                                      "WHERE container IN "
                                   << getSQLStatementArray(msgIDs.size())
                                   << ";";

  removeEntitiesByKeys(
      this->getConnection(), removeBackupMediaByKeysSQLStream.str(), msgIDs);
}

void SQLiteQueryExecutor::removeMediaForMessage(std::string msgID) const {
  static std::string removeMediaByKeySQL =
      "DELETE FROM media "
      "WHERE container IN (?);";
  std::vector<std::string> keys = {msgID};
  removeEntitiesByKeys(this->getConnection(), removeMediaByKeySQL, keys);

  static std::string removeBackupMediaByKeySQL =
      "DELETE FROM backup_media "
      "WHERE container IN (?);";
  removeEntitiesByKeys(this->getConnection(), removeBackupMediaByKeySQL, keys);
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
      this->getConnection(), removeMediaByKeysSQLStream.str(), threadIDs);

  std::stringstream removeBackupMediaByKeysSQLStream;
  removeBackupMediaByKeysSQLStream << "DELETE FROM backup_media "
                                      "WHERE thread IN "
                                   << getSQLStatementArray(threadIDs.size())
                                   << ";";

  removeEntitiesByKeys(
      this->getConnection(), removeBackupMediaByKeysSQLStream.str(), threadIDs);
}

void SQLiteQueryExecutor::replaceMedia(const Media &media, bool backupItem)
    const {
  std::string tableName = backupItem ? "backup_media" : "media";
  std::string replaceMediaSQL = "REPLACE INTO " + tableName +
      "(id, container, thread, uri, type, extras) "
      "VALUES (?, ?, ?, ?, ?, ?)";
  replaceEntity<Media>(this->getConnection(), replaceMediaSQL, media);
}

void SQLiteQueryExecutor::rekeyMediaContainers(std::string from, std::string to)
    const {
  static std::string rekeyMediaContainersSQL =
      "UPDATE media SET container = ? WHERE container = ?;";
  rekeyAllEntities(this->getConnection(), rekeyMediaContainersSQL, from, to);

  static std::string rekeyBackupMediaContainersSQL =
      "UPDATE backup_media SET container = ? WHERE container = ?;";
  rekeyAllEntities(
      this->getConnection(), rekeyBackupMediaContainersSQL, from, to);
}

void SQLiteQueryExecutor::replaceMessageStoreThreads(
    const std::vector<MessageStoreThread> &threads,
    bool backupItem) const {
  std::string tableName =
      backupItem ? "backup_message_store_threads" : "message_store_threads";
  std::string replaceMessageStoreThreadSQL = "REPLACE INTO " + tableName +
      "(id, start_reached) "
      "VALUES (?, ?);";

  for (auto &thread : threads) {
    replaceEntity<MessageStoreThread>(
        this->getConnection(), replaceMessageStoreThreadSQL, thread);
  }
}

void SQLiteQueryExecutor::removeAllMessageStoreThreads() const {
  static std::string removeAllMessageStoreThreadsSQL =
      "DELETE FROM message_store_threads;";
  removeAllEntities(this->getConnection(), removeAllMessageStoreThreadsSQL);

  static std::string removeAllBackupMessageStoreThreadsSQL =
      "DELETE FROM backup_message_store_threads;";
  removeAllEntities(
      this->getConnection(), removeAllBackupMessageStoreThreadsSQL);
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
      this->getConnection(),
      removeMessageStoreThreadsByKeysSQLStream.str(),
      ids);

  std::stringstream removeBackupMessageStoreThreadsByKeysSQLStream;
  removeBackupMessageStoreThreadsByKeysSQLStream
      << "DELETE FROM backup_message_store_threads "
         "WHERE id IN "
      << getSQLStatementArray(ids.size()) << ";";

  removeEntitiesByKeys(
      this->getConnection(),
      removeBackupMessageStoreThreadsByKeysSQLStream.str(),
      ids);
}

std::vector<MessageStoreThread>
SQLiteQueryExecutor::getAllMessageStoreThreads() const {
  static std::string getAllMessageStoreThreadsSQL =
      "SELECT * FROM message_store_threads "
      "UNION "
      "SELECT * FROM backup_message_store_threads;";
  return getAllEntities<MessageStoreThread>(
      this->getConnection(), getAllMessageStoreThreadsSQL);
}

std::vector<Thread> SQLiteQueryExecutor::getAllThreads() const {
  static std::string getAllThreadsSQL =
      "SELECT * FROM threads "
      "UNION "
      "SELECT * FROM backup_threads;";
  return getAllEntities<Thread>(this->getConnection(), getAllThreadsSQL);
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
      this->getConnection(), removeThreadsByKeysSQLStream.str(), ids);

  std::stringstream removeBackupThreadsByKeysSQLStream;
  removeBackupThreadsByKeysSQLStream << "DELETE FROM backup_threads "
                                        "WHERE id IN "
                                     << getSQLStatementArray(ids.size()) << ";";

  removeEntitiesByKeys(
      this->getConnection(), removeBackupThreadsByKeysSQLStream.str(), ids);
};

void SQLiteQueryExecutor::replaceThread(const Thread &thread, bool backupItem)
    const {
  std::string tableName = backupItem ? "backup_threads" : "threads";
  std::string replaceThreadSQL = "REPLACE INTO " + tableName +
      "("
      " id, type, name, description, color, creation_time, parent_thread_id,"
      " containing_thread_id, community, members, roles, current_user,"
      " source_message_id, replies_count, avatar, pinned_count, timestamps) "
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);";

  replaceEntity<Thread>(this->getConnection(), replaceThreadSQL, thread);
};

void SQLiteQueryExecutor::removeAllThreads() const {
  static std::string removeAllThreadsSQL = "DELETE FROM threads;";
  removeAllEntities(this->getConnection(), removeAllThreadsSQL);

  static std::string removeAllBackupThreadsSQL = "DELETE FROM backup_threads;";
  removeAllEntities(this->getConnection(), removeAllBackupThreadsSQL);
};

void SQLiteQueryExecutor::replaceReport(const Report &report) const {
  static std::string replaceReportSQL =
      "REPLACE INTO reports (id, report) "
      "VALUES (?, ?);";

  replaceEntity<Report>(this->getConnection(), replaceReportSQL, report);
}

void SQLiteQueryExecutor::removeAllReports() const {
  static std::string removeAllReportsSQL = "DELETE FROM reports;";
  removeAllEntities(this->getConnection(), removeAllReportsSQL);
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
      this->getConnection(), removeReportsByKeysSQLStream.str(), ids);
}

std::vector<Report> SQLiteQueryExecutor::getAllReports() const {
  static std::string getAllReportsSQL =
      "SELECT * "
      "FROM reports;";
  return getAllEntities<Report>(this->getConnection(), getAllReportsSQL);
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
      this->getConnection(), replacePersistStorageItemSQL, entry);
}

void SQLiteQueryExecutor::removePersistStorageItem(std::string key) const {
  static std::string removePersistStorageItemByKeySQL =
      "DELETE FROM persist_storage "
      "WHERE key IN (?);";
  std::vector<std::string> keys = {key};
  removeEntitiesByKeys(
      this->getConnection(), removePersistStorageItemByKeySQL, keys);
}

std::string SQLiteQueryExecutor::getPersistStorageItem(std::string key) const {
  static std::string getPersistStorageItemByPrimaryKeySQL =
      "SELECT * "
      "FROM persist_storage "
      "WHERE key = ?;";
  std::unique_ptr<PersistItem> entry = getEntityByPrimaryKey<PersistItem>(
      this->getConnection(), getPersistStorageItemByPrimaryKeySQL, key);
  return (entry == nullptr) ? "" : entry->item;
}

void SQLiteQueryExecutor::replaceUser(const UserInfo &userInfo) const {
  static std::string replaceUserSQL =
      "REPLACE INTO users (id, user_info) "
      "VALUES (?, ?);";
  replaceEntity<UserInfo>(this->getConnection(), replaceUserSQL, userInfo);
}

void SQLiteQueryExecutor::removeAllUsers() const {
  static std::string removeAllUsersSQL = "DELETE FROM users;";
  removeAllEntities(this->getConnection(), removeAllUsersSQL);
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
      this->getConnection(), removeUsersByKeysSQLStream.str(), ids);
}

void SQLiteQueryExecutor::replaceKeyserver(
    const KeyserverInfo &keyserverInfo) const {
  static std::string replaceKeyserverSQL =
      "REPLACE INTO keyservers (id, keyserver_info) "
      "VALUES (:id, :keyserver_info);";
  replaceEntity<KeyserverInfo>(
      this->getConnection(), replaceKeyserverSQL, keyserverInfo);

  static std::string replaceKeyserverSyncedSQL =
      "REPLACE INTO keyservers_synced (id, keyserver_info) "
      "VALUES (:id, :synced_keyserver_info);";
  replaceEntity<KeyserverInfo>(
      this->getConnection(), replaceKeyserverSyncedSQL, keyserverInfo);
}

void SQLiteQueryExecutor::removeAllKeyservers() const {
  static std::string removeAllKeyserversSQL = "DELETE FROM keyservers;";
  removeAllEntities(this->getConnection(), removeAllKeyserversSQL);
  static std::string removeAllKeyserversSyncedSQL =
      "DELETE FROM keyservers_synced;";
  removeAllEntities(this->getConnection(), removeAllKeyserversSyncedSQL);
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
      this->getConnection(), removeKeyserversByKeysSQLStream.str(), ids);

  std::stringstream removeKeyserversSyncedByKeysSQLStream;
  removeKeyserversSyncedByKeysSQLStream << "DELETE FROM keyservers_synced "
                                           "WHERE id IN "
                                        << idArray << ";";

  removeEntitiesByKeys(
      this->getConnection(), removeKeyserversSyncedByKeysSQLStream.str(), ids);
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
      this->getConnection(), getAllKeyserversSQL);
}

std::vector<UserInfo> SQLiteQueryExecutor::getAllUsers() const {
  static std::string getAllUsersSQL =
      "SELECT * "
      "FROM users;";
  return getAllEntities<UserInfo>(this->getConnection(), getAllUsersSQL);
}

void SQLiteQueryExecutor::replaceCommunity(
    const CommunityInfo &communityInfo) const {
  static std::string replaceCommunitySQL =
      "REPLACE INTO communities (id, community_info) "
      "VALUES (?, ?);";
  replaceEntity<CommunityInfo>(
      this->getConnection(), replaceCommunitySQL, communityInfo);
}

void SQLiteQueryExecutor::removeAllCommunities() const {
  static std::string removeAllCommunitiesSQL = "DELETE FROM communities;";
  removeAllEntities(this->getConnection(), removeAllCommunitiesSQL);
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
      this->getConnection(), removeCommunitiesByKeysSQLStream.str(), ids);
}

std::vector<CommunityInfo> SQLiteQueryExecutor::getAllCommunities() const {
  static std::string getAllCommunitiesSQL =
      "SELECT * "
      "FROM communities;";
  return getAllEntities<CommunityInfo>(
      this->getConnection(), getAllCommunitiesSQL);
}

void SQLiteQueryExecutor::replaceIntegrityThreadHashes(
    const std::vector<IntegrityThreadHash> &threadHashes) const {
  static std::string replaceIntegrityThreadHashSQL =
      "REPLACE INTO integrity_store (id, thread_hash) "
      "VALUES (?, ?);";
  for (const IntegrityThreadHash &integrityThreadHash : threadHashes) {
    replaceEntity<IntegrityThreadHash>(
        this->getConnection(),
        replaceIntegrityThreadHashSQL,
        integrityThreadHash);
  }
}

void SQLiteQueryExecutor::removeAllIntegrityThreadHashes() const {
  static std::string removeAllIntegrityThreadHashesSQL =
      "DELETE FROM integrity_store;";
  removeAllEntities(this->getConnection(), removeAllIntegrityThreadHashesSQL);
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
      this->getConnection(),
      removeIntegrityThreadHashesByKeysSQLStream.str(),
      ids);
}

std::vector<IntegrityThreadHash>
SQLiteQueryExecutor::getAllIntegrityThreadHashes() const {
  static std::string getAllIntegrityThreadHashesSQL =
      "SELECT * "
      "FROM integrity_store;";
  return getAllEntities<IntegrityThreadHash>(
      this->getConnection(), getAllIntegrityThreadHashesSQL);
}

void SQLiteQueryExecutor::replaceSyncedMetadataEntry(
    const SyncedMetadataEntry &syncedMetadataEntry) const {
  static std::string replaceSyncedMetadataEntrySQL =
      "REPLACE INTO synced_metadata (name, data) "
      "VALUES (?, ?);";
  replaceEntity<SyncedMetadataEntry>(
      this->getConnection(),
      replaceSyncedMetadataEntrySQL,
      syncedMetadataEntry);
}

void SQLiteQueryExecutor::removeAllSyncedMetadata() const {
  static std::string removeAllSyncedMetadataSQL =
      "DELETE FROM synced_metadata;";
  removeAllEntities(this->getConnection(), removeAllSyncedMetadataSQL);
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
      this->getConnection(), removeSyncedMetadataByNamesSQLStream.str(), names);
}

std::vector<SyncedMetadataEntry>
SQLiteQueryExecutor::getAllSyncedMetadata() const {
  static std::string getAllSyncedMetadataSQL =
      "SELECT * "
      "FROM synced_metadata;";
  return getAllEntities<SyncedMetadataEntry>(
      this->getConnection(), getAllSyncedMetadataSQL);
}

void SQLiteQueryExecutor::replaceAuxUserInfo(
    const AuxUserInfo &userInfo) const {
  static std::string replaceAuxUserInfoSQL =
      "REPLACE INTO aux_users (id, aux_user_info) "
      "VALUES (?, ?);";
  replaceEntity<AuxUserInfo>(
      this->getConnection(), replaceAuxUserInfoSQL, userInfo);
}

void SQLiteQueryExecutor::removeAllAuxUserInfos() const {
  static std::string removeAllAuxUserInfosSQL = "DELETE FROM aux_users;";
  removeAllEntities(this->getConnection(), removeAllAuxUserInfosSQL);
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
      this->getConnection(), removeAuxUserInfosByKeysSQLStream.str(), ids);
}

std::vector<AuxUserInfo> SQLiteQueryExecutor::getAllAuxUserInfos() const {
  static std::string getAllAuxUserInfosSQL =
      "SELECT * "
      "FROM aux_users;";
  return getAllEntities<AuxUserInfo>(
      this->getConnection(), getAllAuxUserInfosSQL);
}

void SQLiteQueryExecutor::replaceThreadActivityEntry(
    const ThreadActivityEntry &threadActivityEntry,
    bool backupItem) const {
  std::string tableName =
      backupItem ? "backup_thread_activity" : "thread_activity";
  std::string replaceThreadActivityEntrySQL = "REPLACE INTO " + tableName +
      "(id, thread_activity_store_entry) "
      "VALUES (?, ?);";
  replaceEntity<ThreadActivityEntry>(
      this->getConnection(),
      replaceThreadActivityEntrySQL,
      threadActivityEntry);
}

void SQLiteQueryExecutor::removeAllThreadActivityEntries() const {
  static std::string removeAllThreadActivityEntriesSQL =
      "DELETE FROM thread_activity;";
  removeAllEntities(this->getConnection(), removeAllThreadActivityEntriesSQL);

  static std::string removeAllBackupThreadActivityEntriesSQL =
      "DELETE FROM backup_thread_activity;";
  removeAllEntities(
      this->getConnection(), removeAllBackupThreadActivityEntriesSQL);
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
      this->getConnection(),
      removeThreadActivityEntriesByKeysSQLStream.str(),
      ids);

  std::stringstream removeBackupThreadActivityEntriesByKeysSQLStream;
  removeBackupThreadActivityEntriesByKeysSQLStream
      << "DELETE FROM backup_thread_activity "
         "WHERE id IN "
      << getSQLStatementArray(ids.size()) << ";";

  removeEntitiesByKeys(
      this->getConnection(),
      removeBackupThreadActivityEntriesByKeysSQLStream.str(),
      ids);
}

std::vector<ThreadActivityEntry>
SQLiteQueryExecutor::getAllThreadActivityEntries() const {
  static std::string getAllThreadActivityEntriesSQL =
      "SELECT * FROM thread_activity "
      "UNION "
      "SELECT * FROM backup_thread_activity;";
  return getAllEntities<ThreadActivityEntry>(
      this->getConnection(), getAllThreadActivityEntriesSQL);
}

void SQLiteQueryExecutor::replaceEntry(
    const EntryInfo &entryInfo,
    bool backupItem) const {
  std::string tableName = backupItem ? "backup_entries" : "entries";
  std::string replaceEntrySQL = "REPLACE INTO " + tableName +
      "(id, entry) "
      "VALUES (?, ?);";
  replaceEntity<EntryInfo>(this->getConnection(), replaceEntrySQL, entryInfo);
}

void SQLiteQueryExecutor::removeAllEntries() const {
  static std::string removeAllEntriesSQL = "DELETE FROM entries;";
  removeAllEntities(this->getConnection(), removeAllEntriesSQL);

  static std::string removeAllBackupEntriesSQL = "DELETE FROM backup_entries;";
  removeAllEntities(this->getConnection(), removeAllBackupEntriesSQL);
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
      this->getConnection(), removeEntriesByKeysSQLStream.str(), ids);

  std::stringstream removeBackupEntriesByKeysSQLStream;
  removeBackupEntriesByKeysSQLStream << "DELETE FROM backup_entries "
                                        "WHERE id IN "
                                     << getSQLStatementArray(ids.size()) << ";";
  removeEntitiesByKeys(
      this->getConnection(), removeBackupEntriesByKeysSQLStream.str(), ids);
}

std::vector<EntryInfo> SQLiteQueryExecutor::getAllEntries() const {
  static std::string getAllEntriesSQL =
      "SELECT * FROM entries "
      "UNION "
      "SELECT * FROM backup_entries;";
  return getAllEntities<EntryInfo>(this->getConnection(), getAllEntriesSQL);
}

void SQLiteQueryExecutor::replaceMessageStoreLocalMessageInfo(
    const LocalMessageInfo &localMessageInfo,
    bool backupItem) const {
  std::string tableName =
      backupItem ? "backup_message_store_local" : "message_store_local";
  std::string replaceLocalMessageInfoSQL = "REPLACE INTO " + tableName +
      "(id, local_message_info) "
      "VALUES (?, ?);";
  replaceEntity<LocalMessageInfo>(
      this->getConnection(), replaceLocalMessageInfoSQL, localMessageInfo);
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
      this->getConnection(), removeLocalMessageInfosByKeysSQLStream.str(), ids);

  std::stringstream removeBackupLocalMessageInfosByKeysSQLStream;
  removeBackupLocalMessageInfosByKeysSQLStream
      << "DELETE FROM backup_message_store_local "
         "WHERE id IN "
      << getSQLStatementArray(ids.size()) << ";";

  removeEntitiesByKeys(
      this->getConnection(),
      removeBackupLocalMessageInfosByKeysSQLStream.str(),
      ids);
}

void SQLiteQueryExecutor::removeAllMessageStoreLocalMessageInfos() const {
  static std::string removeAllLocalMessageInfosSQL =
      "DELETE FROM message_store_local;";
  removeAllEntities(this->getConnection(), removeAllLocalMessageInfosSQL);

  static std::string removeAllBackupLocalMessageInfosSQL =
      "DELETE FROM backup_message_store_local;";
  removeAllEntities(this->getConnection(), removeAllBackupLocalMessageInfosSQL);
}

std::vector<LocalMessageInfo>
SQLiteQueryExecutor::getAllMessageStoreLocalMessageInfos() const {
  static std::string getAllLocalMessageInfosSQL =
      "SELECT * FROM message_store_local "
      "UNION "
      "SELECT * FROM backup_message_store_local;";
  return getAllEntities<LocalMessageInfo>(
      this->getConnection(), getAllLocalMessageInfosSQL);
}

void SQLiteQueryExecutor::beginTransaction() const {
  executeQuery(this->getConnection(), "BEGIN TRANSACTION;");
}

void SQLiteQueryExecutor::commitTransaction() const {
  executeQuery(this->getConnection(), "COMMIT;");
}

void SQLiteQueryExecutor::rollbackTransaction() const {
  executeQuery(this->getConnection(), "ROLLBACK;");
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
      this->getConnection(), getAllOlmPersistSessionsSQL);
}

std::optional<std::string>
SQLiteQueryExecutor::getOlmPersistAccountData(int accountID) const {
  static std::string getOlmPersistAccountSQL =
      "SELECT * "
      "FROM olm_persist_account "
      "WHERE id = ?;";
  std::unique_ptr<OlmPersistAccount> result =
      getEntityByIntegerPrimaryKey<OlmPersistAccount>(
          this->getConnection(), getOlmPersistAccountSQL, accountID);
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
      this->getConnection(), replaceOlmPersistAccountSQL, persistAccount);
}

void SQLiteQueryExecutor::storeOlmPersistSession(
    const OlmPersistSession &session) const {
  static std::string replaceOlmPersistSessionSQL =
      "REPLACE INTO olm_persist_sessions "
      "(target_device_id, session_data, version) "
      "VALUES (?, ?, ?);";

  replaceEntity<OlmPersistSession>(
      this->getConnection(), replaceOlmPersistSessionSQL, session);
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
  replaceEntity<Metadata>(this->getConnection(), replaceMetadataSQL, entry);
}

void SQLiteQueryExecutor::clearMetadata(std::string entryName) const {
  static std::string removeMetadataByKeySQL =
      "DELETE FROM metadata "
      "WHERE name IN (?);";
  std::vector<std::string> keys = {entryName};
  removeEntitiesByKeys(this->getConnection(), removeMetadataByKeySQL, keys);
}

std::string SQLiteQueryExecutor::getMetadata(std::string entryName) const {
  std::string getMetadataByPrimaryKeySQL =
      "SELECT * "
      "FROM metadata "
      "WHERE name = ?;";
  std::unique_ptr<Metadata> entry = getEntityByPrimaryKey<Metadata>(
      this->getConnection(), getMetadataByPrimaryKeySQL, entryName);
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
        this->getConnection(), addMessage, message);
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
      this->getConnection(),
      getOutboundP2PMessageSQL,
      "Failed to get outbound messages by ID");

  std::vector<SQLiteOutboundP2PMessage> queryResult =
      getAllEntitiesByPrimaryKeys<SQLiteOutboundP2PMessage>(
          this->getConnection(), getOutboundP2PMessageSQL, ids);
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
      this->getConnection(), query, "Failed to get all messages to device");

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
      this->getConnection(), query, "Failed to remove messages to device");

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
  removeEntitiesByKeys(this->getConnection(), removeMessagesSQL, keys);
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
      this->getConnection(),
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
      this->getConnection(),
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
      this->getConnection(),
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
      this->getConnection(),
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
      this->getConnection(), updateCiphertextQuery, "Failed to set ciphertext");

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

  replaceEntity<InboundP2PMessage>(this->getConnection(), addMessage, message);
}

std::vector<InboundP2PMessage>
SQLiteQueryExecutor::getAllInboundP2PMessage() const {
  static std::string query =
      "SELECT message_id, sender_device_id, plaintext, status, sender_user_id "
      "FROM inbound_p2p_messages;";
  return getAllEntities<InboundP2PMessage>(this->getConnection(), query);
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
      this->getConnection(), removeMessagesSQLStream.str(), ids);
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
      this->getConnection(),
      getInboundP2PMessageSQL,
      "Failed to get inbound messages by ID");

  return getAllEntitiesByPrimaryKeys<InboundP2PMessage>(
      this->getConnection(), getInboundP2PMessageSQL, ids);
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
      this->getConnection(),
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
      this->getConnection(),
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
    messageIDs.push_back(message.message.id);
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
      this->getConnection(),
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
  replaceEntity<DMOperation>(this->getConnection(), query, operation);
}

void SQLiteQueryExecutor::removeAllDMOperations() const {
  static std::string query = "DELETE FROM dm_operations;";
  removeAllEntities(this->getConnection(), query);
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
  removeEntitiesByKeys(this->getConnection(), queryStream.str(), ids);
}

std::vector<DMOperation> SQLiteQueryExecutor::getDMOperations() const {
  static std::string query =
      "SELECT id, type, operation "
      "FROM dm_operations;";
  return getAllEntities<DMOperation>(this->getConnection(), query);
}

std::vector<DMOperation> SQLiteQueryExecutor::getDMOperationsByType(
    const std::string &operationType) const {
  static std::string query =
      "SELECT id, type, operation "
      "FROM dm_operations "
      "WHERE type = ?;";

  std::vector<std::string> types{operationType};
  return getAllEntitiesByPrimaryKeys<DMOperation>(
      this->getConnection(), query, types);
}

void SQLiteQueryExecutor::copyContentFromDatabase(
    const std::string sourceDatabasePath,
    std::optional<std::string> encryptionKey) const {
  std::vector<std::string> tableNames(
      SQLiteBackup::tablesAllowlist.begin(),
      SQLiteBackup::tablesAllowlist.end());

  if (!SQLiteUtils::fileExists(sourceDatabasePath)) {
    std::stringstream errorMessage;
    errorMessage << "Error: Source file does not exist at path: "
                 << sourceDatabasePath << std::endl;
    Logger::log(errorMessage.str());
    throw std::runtime_error(errorMessage.str());
  }

  std::string keyString = "KEY ''";
  if (encryptionKey.has_value()) {
    keyString = "KEY \"x'" + encryptionKey.value() + "'\"";
  }

  std::ostringstream sql;
  sql << "ATTACH DATABASE '" << sourceDatabasePath << "' AS sourceDB "
      << keyString << ";";
  for (const auto &tableName : tableNames) {
    sql << "INSERT OR IGNORE INTO " << tableName << " SELECT *"
        << " FROM sourceDB." << tableName << ";" << std::endl;
  }
  sql << "DETACH DATABASE sourceDB;";
  executeQuery(this->getConnection(), sql.str());
}

void SQLiteQueryExecutor::restoreFromBackupLog(
    const std::vector<std::uint8_t> &backupLog) const {
  this->connectionManager->restoreFromBackupLog(backupLog);
}

int SQLiteQueryExecutor::getDatabaseVersion() const {
  return SQLiteUtils::getDatabaseVersion(this->getConnection());
}

std::optional<std::string>
SQLiteQueryExecutor::getSyncedMetadata(const std::string &entryName) const {
  std::string getMetadataByPrimaryKeySQL =
      "SELECT * "
      "FROM synced_metadata "
      "WHERE name = ?;";
  std::unique_ptr<SyncedMetadataEntry> entry =
      getEntityByPrimaryKey<SyncedMetadataEntry>(
          this->getConnection(), getMetadataByPrimaryKeySQL, entryName);

  if (entry == nullptr) {
    return std::nullopt;
  }
  return entry->data;
}

} // namespace comm
