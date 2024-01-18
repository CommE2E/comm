#pragma once

#include <sqlite3.h>
#include <memory>
#include <string>

#include "Nullable.h"

namespace comm {

struct Thread {
  std::string id;
  int type;
  std::unique_ptr<std::string> name;
  std::unique_ptr<std::string> description;
  std::string color;
  int64_t creation_time;
  std::unique_ptr<std::string> parent_thread_id;
  std::unique_ptr<std::string> containing_thread_id;
  std::unique_ptr<std::string> community;
  std::string members;
  std::string roles;
  std::string current_user;
  std::unique_ptr<std::string> source_message_id;
  int replies_count;
  std::unique_ptr<std::string> avatar;
  int pinned_count;

  static Thread fromSQLResult(sqlite3_stmt *sqlRow, int idx) {
    const char *name =
        reinterpret_cast<const char *>(sqlite3_column_text(sqlRow, idx + 2));
    const char *description =
        reinterpret_cast<const char *>(sqlite3_column_text(sqlRow, idx + 3));
    const char *parent_thread_id =
        reinterpret_cast<const char *>(sqlite3_column_text(sqlRow, idx + 6));
    const char *containing_thread_id =
        reinterpret_cast<const char *>(sqlite3_column_text(sqlRow, idx + 7));
    const char *community =
        reinterpret_cast<const char *>(sqlite3_column_text(sqlRow, idx + 8));
    const char *source_message_id =
        reinterpret_cast<const char *>(sqlite3_column_text(sqlRow, idx + 12));
    const char *avatar =
        reinterpret_cast<const char *>(sqlite3_column_text(sqlRow, idx + 14));

    return Thread{
        reinterpret_cast<const char *>(sqlite3_column_text(sqlRow, idx)),
        sqlite3_column_int(sqlRow, idx + 1),
        name ? std::make_unique<std::string>(name) : nullptr,
        description ? std::make_unique<std::string>(description) : nullptr,
        reinterpret_cast<const char *>(sqlite3_column_text(sqlRow, idx + 4)),
        sqlite3_column_int64(sqlRow, idx + 5),
        parent_thread_id ? std::make_unique<std::string>(parent_thread_id)
                         : nullptr,
        containing_thread_id
            ? std::make_unique<std::string>(containing_thread_id)
            : nullptr,
        community ? std::make_unique<std::string>(community) : nullptr,
        reinterpret_cast<const char *>(sqlite3_column_text(sqlRow, idx + 9)),
        reinterpret_cast<const char *>(sqlite3_column_text(sqlRow, idx + 10)),
        reinterpret_cast<const char *>(sqlite3_column_text(sqlRow, idx + 11)),
        source_message_id ? std::make_unique<std::string>(source_message_id)
                          : nullptr,
        sqlite3_column_int(sqlRow, idx + 13),
        avatar ? std::make_unique<std::string>(avatar) : nullptr,
        sqlite3_column_int(sqlRow, idx + 15),
    };
  }

  int bindToSQL(sqlite3_stmt *sql, int idx) const {
    sqlite3_bind_text(sql, idx, id.c_str(), -1, SQLITE_STATIC);
    sqlite3_bind_int(sql, idx + 1, type);

    if (name == nullptr) {
      sqlite3_bind_null(sql, idx + 2);
    } else {

      sqlite3_bind_text(sql, idx + 2, name->c_str(), -1, SQLITE_TRANSIENT);
    }

    if (description == nullptr) {
      sqlite3_bind_null(sql, idx + 3);
    } else {
      sqlite3_bind_text(
          sql, idx + 3, description->c_str(), -1, SQLITE_TRANSIENT);
    }

    sqlite3_bind_text(sql, idx + 4, color.c_str(), -1, SQLITE_STATIC);
    sqlite3_bind_int64(sql, idx + 5, reinterpret_cast<sqlite3_int64>(time));

    if (parent_thread_id == nullptr) {
      sqlite3_bind_null(sql, idx + 6);
    } else {
      sqlite3_bind_text(
          sql, idx + 6, parent_thread_id->c_str(), -1, SQLITE_TRANSIENT);
    }

    if (containing_thread_id == nullptr) {
      sqlite3_bind_null(sql, idx + 7);
    } else {
      sqlite3_bind_text(
          sql, idx + 7, containing_thread_id->c_str(), -1, SQLITE_TRANSIENT);
    }

    if (community == nullptr) {
      sqlite3_bind_null(sql, idx + 8);
    } else {
      sqlite3_bind_text(sql, idx + 8, community->c_str(), -1, SQLITE_TRANSIENT);
    }

    sqlite3_bind_text(sql, idx + 9, members.c_str(), -1, SQLITE_STATIC);
    sqlite3_bind_text(sql, idx + 10, roles.c_str(), -1, SQLITE_STATIC);
    sqlite3_bind_text(sql, idx + 11, current_user.c_str(), -1, SQLITE_STATIC);

    if (source_message_id == nullptr) {
      sqlite3_bind_null(sql, idx + 12);
    } else {
      sqlite3_bind_text(
          sql, idx + 12, source_message_id->c_str(), -1, SQLITE_TRANSIENT);
    }

    sqlite3_bind_int(sql, idx + 13, replies_count);

    if (avatar == nullptr) {
      sqlite3_bind_null(sql, idx + 14);
    } else {
      sqlite3_bind_text(sql, idx + 15, avatar->c_str(), -1, SQLITE_TRANSIENT);
    }

    return sqlite3_bind_int(sql, idx + 15, pinned_count);
  }
};

struct WebThread {
  std::string id;
  int type;
  NullableString name;
  NullableString description;
  std::string color;
  std::string creation_time;
  NullableString parent_thread_id;
  NullableString containing_thread_id;
  NullableString community;
  std::string members;
  std::string roles;
  std::string current_user;
  NullableString source_message_id;
  int replies_count;
  NullableString avatar;
  int pinned_count;

  WebThread() = default;

  WebThread(const Thread &thread) {
    id = thread.id;
    type = thread.type;
    name = NullableString(thread.name);
    description = NullableString(thread.description);
    color = thread.color;
    creation_time = std::to_string(thread.creation_time);
    parent_thread_id = NullableString(thread.parent_thread_id);
    containing_thread_id = NullableString(thread.containing_thread_id);
    community = NullableString(thread.community);
    members = thread.members;
    roles = thread.roles;
    current_user = thread.current_user;
    source_message_id = NullableString(thread.source_message_id);
    replies_count = thread.replies_count;
    avatar = NullableString(thread.avatar);
    pinned_count = thread.pinned_count;
  }

  Thread toThread() const {
    Thread thread;
    thread.id = id;
    thread.type = type;
    thread.name = name.resetValue();
    thread.description = description.resetValue();
    thread.color = color;
    thread.creation_time = std::stoll(creation_time);
    thread.parent_thread_id = parent_thread_id.resetValue();
    thread.containing_thread_id = containing_thread_id.resetValue();
    thread.community = community.resetValue();
    thread.members = members;
    thread.roles = roles;
    thread.current_user = current_user;
    thread.source_message_id = source_message_id.resetValue();
    thread.replies_count = replies_count;
    thread.avatar = avatar.resetValue();
    thread.pinned_count = pinned_count;
    return thread;
  }
};

} // namespace comm
