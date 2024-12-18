#pragma once

#include <sqlite3.h>
#include <memory>
#include <string>

#include "Nullable.h"
#include "SQLiteDataConverters.h"

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
  std::unique_ptr<std::string> timestamps;

  static Thread fromSQLResult(sqlite3_stmt *sqlRow, int idx) {
    return Thread{
        getStringFromSQLRow(sqlRow, idx),
        getIntFromSQLRow(sqlRow, idx + 1),
        getStringPtrFromSQLRow(sqlRow, idx + 2),
        getStringPtrFromSQLRow(sqlRow, idx + 3),
        getStringFromSQLRow(sqlRow, idx + 4),
        getInt64FromSQLRow(sqlRow, idx + 5),
        getStringPtrFromSQLRow(sqlRow, idx + 6),
        getStringPtrFromSQLRow(sqlRow, idx + 7),
        getStringPtrFromSQLRow(sqlRow, idx + 8),
        getStringFromSQLRow(sqlRow, idx + 9),
        getStringFromSQLRow(sqlRow, idx + 10),
        getStringFromSQLRow(sqlRow, idx + 11),
        getStringPtrFromSQLRow(sqlRow, idx + 12),
        getIntFromSQLRow(sqlRow, idx + 13),
        getStringPtrFromSQLRow(sqlRow, idx + 14),
        getIntFromSQLRow(sqlRow, idx + 15),
        getStringPtrFromSQLRow(sqlRow, idx + 16),
    };
  }

  int bindToSQL(sqlite3_stmt *sql, int idx) const {
    bindStringToSQL(id, sql, idx);
    bindIntToSQL(type, sql, idx + 1);
    bindStringPtrToSQL(name, sql, idx + 2);
    bindStringPtrToSQL(description, sql, idx + 3);
    bindStringToSQL(color, sql, idx + 4);
    bindInt64ToSQL(creation_time, sql, idx + 5);
    bindStringPtrToSQL(parent_thread_id, sql, idx + 6);
    bindStringPtrToSQL(containing_thread_id, sql, idx + 7);
    bindStringPtrToSQL(community, sql, idx + 8);
    bindStringToSQL(members, sql, idx + 9);
    bindStringToSQL(roles, sql, idx + 10);
    bindStringToSQL(current_user, sql, idx + 11);
    bindStringPtrToSQL(source_message_id, sql, idx + 12);
    bindIntToSQL(replies_count, sql, idx + 13);
    bindStringPtrToSQL(avatar, sql, idx + 14);
    bindIntToSQL(pinned_count, sql, idx + 15);
    return bindStringPtrToSQL(timestamps, sql, idx + 16);
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
  NullableString timestamps;

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
    timestamps = NullableString(thread.timestamps);
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
    thread.timestamps = timestamps.resetValue();
    return thread;
  }
};

} // namespace comm
