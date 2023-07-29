#include "SQLiteQueryExecutor.h"
#include "Logger.h"
#include "SQLiteRawQueryExecutor.h"
#include "sqlite_orm.h"

#include "entities/Metadata.h"
#include <fstream>
#include <iostream>
#include <thread>

#ifndef EMSCRIPTEN
#include "CommSecureStore.h"
#endif

#define ACCOUNT_ID 1

namespace comm {

using namespace sqlite_orm;

std::string SQLiteQueryExecutor::sqliteFilePath;
std::string SQLiteQueryExecutor::encryptionKey;
std::once_flag SQLiteQueryExecutor::initialized;
int SQLiteQueryExecutor::sqlcipherEncryptionKeySize = 64;
std::string SQLiteQueryExecutor::secureStoreEncryptionKeyID =
    "comm.encryptionKey";

void on_database_open(sqlite3 *db) {
  SQLiteRawQueryExecutor::setEncryptionKey(
      db, SQLiteQueryExecutor::encryptionKey);
  SQLiteRawQueryExecutor::traceQueries(db);
}

bool file_exists(const std::string &file_path) {
  std::ifstream file(file_path.c_str());
  return file.good();
}

void attempt_delete_file(
    const std::string &file_path,
    const char *error_message) {
  if (std::remove(file_path.c_str())) {
    throw std::system_error(errno, std::generic_category(), error_message);
  }
}

void attempt_rename_file(
    const std::string &old_path,
    const std::string &new_path,
    const char *error_message) {
  if (std::rename(old_path.c_str(), new_path.c_str())) {
    throw std::system_error(errno, std::generic_category(), error_message);
  }
}

bool is_database_queryable(sqlite3 *db, bool use_encryption_key) {
  char *err_msg;
  sqlite3_open(SQLiteQueryExecutor::sqliteFilePath.c_str(), &db);
  // According to SQLCipher documentation running some SELECT is the only way to
  // check for key validity
  if (use_encryption_key) {
    SQLiteRawQueryExecutor::setEncryptionKey(
        db, SQLiteQueryExecutor::encryptionKey);
  }
  sqlite3_exec(
      db, "SELECT COUNT(*) FROM sqlite_master;", nullptr, nullptr, &err_msg);
  sqlite3_close(db);
  return !err_msg;
}

void validate_encryption() {
  std::string temp_encrypted_db_path =
      SQLiteQueryExecutor::sqliteFilePath + "_temp_encrypted";

  bool temp_encrypted_exists = file_exists(temp_encrypted_db_path);
  bool default_location_exists =
      file_exists(SQLiteQueryExecutor::sqliteFilePath);

  if (temp_encrypted_exists && default_location_exists) {
    Logger::log(
        "Previous encryption attempt failed. Repeating encryption process from "
        "the beginning.");
    attempt_delete_file(
        temp_encrypted_db_path,
        "Failed to delete corrupted encrypted database.");
  } else if (temp_encrypted_exists && !default_location_exists) {
    Logger::log(
        "Moving temporary encrypted database to default location failed in "
        "previous encryption attempt. Repeating rename step.");
    attempt_rename_file(
        temp_encrypted_db_path,
        SQLiteQueryExecutor::sqliteFilePath,
        "Failed to move encrypted database to default location.");
    return;
  } else if (!default_location_exists) {
    Logger::log(
        "Database not present yet. It will be created encrypted under default "
        "path.");
    return;
  }

  sqlite3 *db;
  if (is_database_queryable(db, true)) {
    Logger::log(
        "Database exists under default path and it is correctly encrypted.");
    return;
  }

  if (!is_database_queryable(db, false)) {
    Logger::log(
        "Database exists but it is encrypted with key that was lost. "
        "Attempting database deletion. New encrypted one will be created.");
    attempt_delete_file(
        SQLiteQueryExecutor::sqliteFilePath.c_str(),
        "Failed to delete database encrypted with lost key.");
    return;
  } else {
    Logger::log(
        "Database exists but it is not encrypted. Attempting encryption "
        "process.");
  }
  sqlite3_open(SQLiteQueryExecutor::sqliteFilePath.c_str(), &db);

  std::string createEncryptedCopySQL = "ATTACH DATABASE '" +
      temp_encrypted_db_path +
      "' AS encrypted_comm "
      "KEY \"x'" +
      SQLiteQueryExecutor::encryptionKey +
      "'\";"
      "SELECT sqlcipher_export('encrypted_comm');"
      "DETACH DATABASE encrypted_comm;";

  char *encryption_error;
  sqlite3_exec(
      db, createEncryptedCopySQL.c_str(), nullptr, nullptr, &encryption_error);

  if (encryption_error) {
    throw std::system_error(
        ECANCELED,
        std::generic_category(),
        "Failed to create encrypted copy of the original database.");
  }
  sqlite3_close(db);

  attempt_delete_file(
      SQLiteQueryExecutor::sqliteFilePath,
      "Failed to delete unencrypted database.");
  attempt_rename_file(
      temp_encrypted_db_path,
      SQLiteQueryExecutor::sqliteFilePath,
      "Failed to move encrypted database to default location.");
  Logger::log("Encryption completed successfully.");
}

void SQLiteQueryExecutor::migrate() {
  validate_encryption();

  sqlite3 *db;
  sqlite3_open(SQLiteQueryExecutor::sqliteFilePath.c_str(), &db);
  on_database_open(db);

  std::stringstream db_path;
  db_path << "db path: " << SQLiteQueryExecutor::sqliteFilePath.c_str()
          << std::endl;
  Logger::log(db_path.str());

  try {
    SQLiteRawQueryExecutor::migrate(db);
    sqlite3_close(db);
  } catch (std::runtime_error &e) {
    sqlite3_close(db);
    Logger::log(e.what());
    throw e;
  }
}

auto &SQLiteQueryExecutor::getStorage() {
  static auto storage = make_storage(
      SQLiteQueryExecutor::sqliteFilePath,
      make_index("messages_idx_thread_time", &Message::thread, &Message::time),
      make_index("media_idx_container", &Media::container),
      make_table(
          "drafts",
          make_column("key", &Draft::key, unique(), primary_key()),
          make_column("text", &Draft::text)),
      make_table(
          "messages",
          make_column("id", &Message::id, unique(), primary_key()),
          make_column("local_id", &Message::local_id),
          make_column("thread", &Message::thread),
          make_column("user", &Message::user),
          make_column("type", &Message::type),
          make_column("future_type", &Message::future_type),
          make_column("content", &Message::content),
          make_column("time", &Message::time)),
      make_table(
          "olm_persist_account",
          make_column("id", &OlmPersistAccount::id, unique(), primary_key()),
          make_column("account_data", &OlmPersistAccount::account_data)),
      make_table(
          "olm_persist_sessions",
          make_column(
              "target_user_id",
              &OlmPersistSession::target_user_id,
              unique(),
              primary_key()),
          make_column("session_data", &OlmPersistSession::session_data)),
      make_table(
          "media",
          make_column("id", &Media::id, unique(), primary_key()),
          make_column("container", &Media::container),
          make_column("thread", &Media::thread),
          make_column("uri", &Media::uri),
          make_column("type", &Media::type),
          make_column("extras", &Media::extras)),
      make_table(
          "threads",
          make_column("id", &Thread::id, unique(), primary_key()),
          make_column("type", &Thread::type),
          make_column("name", &Thread::name),
          make_column("description", &Thread::description),
          make_column("color", &Thread::color),
          make_column("creation_time", &Thread::creation_time),
          make_column("parent_thread_id", &Thread::parent_thread_id),
          make_column("containing_thread_id", &Thread::containing_thread_id),
          make_column("community", &Thread::community),
          make_column("members", &Thread::members),
          make_column("roles", &Thread::roles),
          make_column("current_user", &Thread::current_user),
          make_column("source_message_id", &Thread::source_message_id),
          make_column("replies_count", &Thread::replies_count),
          make_column("avatar", &Thread::avatar),
          make_column("pinned_count", &Thread::pinned_count, default_value(0))),
      make_table(
          "metadata",
          make_column("name", &Metadata::name, unique(), primary_key()),
          make_column("data", &Metadata::data)),
      make_table(
          "message_store_threads",
          make_column("id", &MessageStoreThread::id, unique(), primary_key()),
          make_column("start_reached", &MessageStoreThread::start_reached),
          make_column(
              "last_navigated_to", &MessageStoreThread::last_navigated_to),
          make_column("last_pruned", &MessageStoreThread::last_pruned)),
      make_table(
          "reports",
          make_column("id", &Report::id, unique(), primary_key()),
          make_column("report", &Report::report)),
      make_table(
          "persist_storage",
          make_column("key", &PersistItem::key, unique(), primary_key()),
          make_column("item", &PersistItem::item))

  );
  storage.on_open = on_database_open;
  return storage;
}

SQLiteQueryExecutor::SQLiteQueryExecutor() {
  SQLiteQueryExecutor::migrate();
}

SQLiteQueryExecutor::SQLiteQueryExecutor(std::string sqliteFilePath) {
  SQLiteQueryExecutor::sqliteFilePath = sqliteFilePath;
  SQLiteQueryExecutor::migrate();
}

std::string SQLiteQueryExecutor::getDraft(std::string key) const {
  std::unique_ptr<Draft> draft =
      SQLiteQueryExecutor::getStorage().get_pointer<Draft>(key);
  return (draft == nullptr) ? "" : draft->text;
}

std::unique_ptr<Thread>
SQLiteQueryExecutor::getThread(std::string threadID) const {
  return SQLiteQueryExecutor::getStorage().get_pointer<Thread>(threadID);
}

void SQLiteQueryExecutor::updateDraft(std::string key, std::string text) const {
  Draft draft = {key, text};
  SQLiteQueryExecutor::getStorage().replace(draft);
}

bool SQLiteQueryExecutor::moveDraft(std::string oldKey, std::string newKey)
    const {
  std::unique_ptr<Draft> draft =
      SQLiteQueryExecutor::getStorage().get_pointer<Draft>(oldKey);
  if (draft == nullptr) {
    return false;
  }
  draft->key = newKey;
  SQLiteQueryExecutor::getStorage().replace(*draft);
  SQLiteQueryExecutor::getStorage().remove<Draft>(oldKey);
  return true;
}

std::vector<Draft> SQLiteQueryExecutor::getAllDrafts() const {
  return SQLiteQueryExecutor::getStorage().get_all<Draft>();
}

void SQLiteQueryExecutor::removeAllDrafts() const {
  SQLiteQueryExecutor::getStorage().remove_all<Draft>();
}

void SQLiteQueryExecutor::removeAllMessages() const {
  SQLiteQueryExecutor::getStorage().remove_all<Message>();
}

std::vector<std::pair<Message, std::vector<Media>>>
SQLiteQueryExecutor::getAllMessages() const {

  auto rows = SQLiteQueryExecutor::getStorage().select(
      columns(
          &Message::id,
          &Message::local_id,
          &Message::thread,
          &Message::user,
          &Message::type,
          &Message::future_type,
          &Message::content,
          &Message::time,
          &Media::id,
          &Media::container,
          &Media::thread,
          &Media::uri,
          &Media::type,
          &Media::extras),
      left_join<Media>(on(c(&Message::id) == &Media::container)),
      order_by(&Message::id));

  std::vector<std::pair<Message, std::vector<Media>>> allMessages;
  allMessages.reserve(rows.size());

  std::string prev_msg_idx{};
  for (auto &row : rows) {
    auto msg_id = std::get<0>(row);
    if (msg_id == prev_msg_idx) {
      allMessages.back().second.push_back(Media{
          std::get<8>(row),
          std::move(std::get<9>(row)),
          std::move(std::get<10>(row)),
          std::move(std::get<11>(row)),
          std::move(std::get<12>(row)),
          std::move(std::get<13>(row)),
      });
    } else {
      std::vector<Media> mediaForMsg;
      if (!std::get<8>(row).empty()) {
        mediaForMsg.push_back(Media{
            std::get<8>(row),
            std::move(std::get<9>(row)),
            std::move(std::get<10>(row)),
            std::move(std::get<11>(row)),
            std::move(std::get<12>(row)),
            std::move(std::get<13>(row)),
        });
      }
      allMessages.push_back(std::make_pair(
          Message{
              msg_id,
              std::move(std::get<1>(row)),
              std::move(std::get<2>(row)),
              std::move(std::get<3>(row)),
              std::get<4>(row),
              std::move(std::get<5>(row)),
              std::move(std::get<6>(row)),
              std::get<7>(row)},
          mediaForMsg));

      prev_msg_idx = msg_id;
    }
  }

  return allMessages;
}

void SQLiteQueryExecutor::removeMessages(
    const std::vector<std::string> &ids) const {
  SQLiteQueryExecutor::getStorage().remove_all<Message>(
      where(in(&Message::id, ids)));
}

void SQLiteQueryExecutor::removeMessagesForThreads(
    const std::vector<std::string> &threadIDs) const {
  SQLiteQueryExecutor::getStorage().remove_all<Message>(
      where(in(&Message::thread, threadIDs)));
}

void SQLiteQueryExecutor::replaceMessage(const Message &message) const {
  SQLiteQueryExecutor::getStorage().replace(message);
}

void SQLiteQueryExecutor::rekeyMessage(std::string from, std::string to) const {
  auto msg = SQLiteQueryExecutor::getStorage().get<Message>(from);
  msg.id = to;
  SQLiteQueryExecutor::getStorage().replace(msg);
  SQLiteQueryExecutor::getStorage().remove<Message>(from);
}

void SQLiteQueryExecutor::removeAllMedia() const {
  SQLiteQueryExecutor::getStorage().remove_all<Media>();
}

void SQLiteQueryExecutor::removeMediaForMessages(
    const std::vector<std::string> &msg_ids) const {
  SQLiteQueryExecutor::getStorage().remove_all<Media>(
      where(in(&Media::container, msg_ids)));
}

void SQLiteQueryExecutor::removeMediaForMessage(std::string msg_id) const {
  SQLiteQueryExecutor::getStorage().remove_all<Media>(
      where(c(&Media::container) == msg_id));
}

void SQLiteQueryExecutor::removeMediaForThreads(
    const std::vector<std::string> &thread_ids) const {
  SQLiteQueryExecutor::getStorage().remove_all<Media>(
      where(in(&Media::thread, thread_ids)));
}

void SQLiteQueryExecutor::replaceMedia(const Media &media) const {
  SQLiteQueryExecutor::getStorage().replace(media);
}

void SQLiteQueryExecutor::rekeyMediaContainers(std::string from, std::string to)
    const {
  SQLiteQueryExecutor::getStorage().update_all(
      set(c(&Media::container) = to), where(c(&Media::container) == from));
}

void SQLiteQueryExecutor::replaceMessageStoreThreads(
    const std::vector<MessageStoreThread> &threads) const {
  for (auto &thread : threads) {
    SQLiteQueryExecutor::getStorage().replace(thread);
  }
}

void SQLiteQueryExecutor::removeAllMessageStoreThreads() const {
  SQLiteQueryExecutor::getStorage().remove_all<MessageStoreThread>();
}

void SQLiteQueryExecutor::removeMessageStoreThreads(
    const std::vector<std::string> &ids) const {
  SQLiteQueryExecutor::getStorage().remove_all<MessageStoreThread>(
      where(in(&MessageStoreThread::id, ids)));
}

std::vector<MessageStoreThread>
SQLiteQueryExecutor::getAllMessageStoreThreads() const {
  return SQLiteQueryExecutor::getStorage().get_all<MessageStoreThread>();
}

std::vector<Thread> SQLiteQueryExecutor::getAllThreads() const {
  return SQLiteQueryExecutor::getStorage().get_all<Thread>();
};

void SQLiteQueryExecutor::removeThreads(std::vector<std::string> ids) const {
  SQLiteQueryExecutor::getStorage().remove_all<Thread>(
      where(in(&Thread::id, ids)));
};

void SQLiteQueryExecutor::replaceThread(const Thread &thread) const {
  SQLiteQueryExecutor::getStorage().replace(thread);
};

void SQLiteQueryExecutor::removeAllThreads() const {
  SQLiteQueryExecutor::getStorage().remove_all<Thread>();
};

void SQLiteQueryExecutor::replaceReport(const Report &report) const {
  SQLiteQueryExecutor::getStorage().replace(report);
}

void SQLiteQueryExecutor::removeAllReports() const {
  SQLiteQueryExecutor::getStorage().remove_all<Report>();
}

void SQLiteQueryExecutor::removeReports(
    const std::vector<std::string> &ids) const {
  SQLiteQueryExecutor::getStorage().remove_all<Report>(
      where(in(&Report::id, ids)));
}

std::vector<Report> SQLiteQueryExecutor::getAllReports() const {
  return SQLiteQueryExecutor::getStorage().get_all<Report>();
}

void SQLiteQueryExecutor::setPersistStorageItem(
    std::string key,
    std::string item) const {
  PersistItem entry{
      key,
      item,
  };
  SQLiteQueryExecutor::getStorage().replace(entry);
}

void SQLiteQueryExecutor::removePersistStorageItem(std::string key) const {
  SQLiteQueryExecutor::getStorage().remove<PersistItem>(key);
}

std::string SQLiteQueryExecutor::getPersistStorageItem(std::string key) const {
  std::unique_ptr<PersistItem> entry =
      SQLiteQueryExecutor::getStorage().get_pointer<PersistItem>(key);
  return (entry == nullptr) ? "" : entry->item;
}

void SQLiteQueryExecutor::beginTransaction() const {
  SQLiteQueryExecutor::getStorage().begin_transaction();
}

void SQLiteQueryExecutor::commitTransaction() const {
  SQLiteQueryExecutor::getStorage().commit();
}

void SQLiteQueryExecutor::rollbackTransaction() const {
  SQLiteQueryExecutor::getStorage().rollback();
}

std::vector<OlmPersistSession>
SQLiteQueryExecutor::getOlmPersistSessionsData() const {
  return SQLiteQueryExecutor::getStorage().get_all<OlmPersistSession>();
}

std::optional<std::string>
SQLiteQueryExecutor::getOlmPersistAccountData() const {
  std::vector<OlmPersistAccount> result =
      SQLiteQueryExecutor::getStorage().get_all<OlmPersistAccount>();
  if (result.size() > 1) {
    throw std::system_error(
        ECANCELED,
        std::generic_category(),
        "Multiple records found for the olm_persist_account table");
  }
  return (result.size() == 0)
      ? std::nullopt
      : std::optional<std::string>(result[0].account_data);
}

void SQLiteQueryExecutor::storeOlmPersistData(crypto::Persist persist) const {
  OlmPersistAccount persistAccount = {
      ACCOUNT_ID, std::string(persist.account.begin(), persist.account.end())};
  SQLiteQueryExecutor::getStorage().replace(persistAccount);
  for (auto it = persist.sessions.begin(); it != persist.sessions.end(); it++) {
    OlmPersistSession persistSession = {
        it->first, std::string(it->second.begin(), it->second.end())};
    SQLiteQueryExecutor::getStorage().replace(persistSession);
  }
}

void SQLiteQueryExecutor::setNotifyToken(std::string token) const {
  this->setMetadata("notify_token", token);
}

void SQLiteQueryExecutor::clearNotifyToken() const {
  this->clearMetadata("notify_token");
}

void SQLiteQueryExecutor::setCurrentUserID(std::string userID) const {
  this->setMetadata("current_user_id", userID);
}

std::string SQLiteQueryExecutor::getCurrentUserID() const {
  return this->getMetadata("current_user_id");
}

void SQLiteQueryExecutor::setDeviceID(std::string deviceID) const {
  this->setMetadata("device_id", deviceID);
};

std::string SQLiteQueryExecutor::getDeviceID() const {
  return this->getMetadata("device_id");
};

void SQLiteQueryExecutor::setMetadata(std::string entry_name, std::string data)
    const {
  Metadata entry{
      entry_name,
      data,
  };
  SQLiteQueryExecutor::getStorage().replace(entry);
}

void SQLiteQueryExecutor::clearMetadata(std::string entry_name) const {
  SQLiteQueryExecutor::getStorage().remove<Metadata>(entry_name);
}

std::string SQLiteQueryExecutor::getMetadata(std::string entry_name) const {
  std::unique_ptr<Metadata> entry =
      SQLiteQueryExecutor::getStorage().get_pointer<Metadata>(entry_name);
  return (entry == nullptr) ? "" : entry->data;
}

#ifndef EMSCRIPTEN
void SQLiteQueryExecutor::clearSensitiveData() {
  if (file_exists(SQLiteQueryExecutor::sqliteFilePath) &&
      std::remove(SQLiteQueryExecutor::sqliteFilePath.c_str())) {
    std::ostringstream errorStream;
    errorStream << "Failed to delete database file. Details: "
                << strerror(errno);
    throw std::system_error(errno, std::generic_category(), errorStream.str());
  }
  SQLiteQueryExecutor::assign_encryption_key();
  SQLiteQueryExecutor::migrate();
}

void SQLiteQueryExecutor::initialize(std::string &databasePath) {
  std::call_once(SQLiteQueryExecutor::initialized, [&databasePath]() {
    SQLiteQueryExecutor::sqliteFilePath = databasePath;
    CommSecureStore commSecureStore{};
    folly::Optional<std::string> maybeEncryptionKey =
        commSecureStore.get(SQLiteQueryExecutor::secureStoreEncryptionKeyID);

    if (file_exists(databasePath) && maybeEncryptionKey) {
      SQLiteQueryExecutor::encryptionKey = maybeEncryptionKey.value();
      return;
    }
    SQLiteQueryExecutor::assign_encryption_key();
  });
}

void SQLiteQueryExecutor::assign_encryption_key() {
  CommSecureStore commSecureStore{};
  std::string encryptionKey = comm::crypto::Tools::generateRandomHexString(
      SQLiteQueryExecutor::sqlcipherEncryptionKeySize);
  commSecureStore.set(
      SQLiteQueryExecutor::secureStoreEncryptionKeyID, encryptionKey);
  SQLiteQueryExecutor::encryptionKey = encryptionKey;
}
#endif

} // namespace comm
