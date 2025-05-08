#pragma once

#include "Media.h"
#include "Nullable.h"
#include <sqlite3.h>
#include <memory>
#include <optional>
#include <string>
#include <vector>

namespace comm {

struct Message {
  std::string id;
  std::optional<std::string> local_id;
  std::string thread;
  std::string user;
  int type;
  std::optional<int> future_type;
  std::optional<std::string> content;
  int64_t time;

  static Message fromSQLResult(sqlite3_stmt *sqlRow, int idx) {
    return Message{
        getStringFromSQLRow(sqlRow, idx),
        getOptionalStringFromSQLRow(sqlRow, idx + 1),
        getStringFromSQLRow(sqlRow, idx + 2),
        getStringFromSQLRow(sqlRow, idx + 3),
        getIntFromSQLRow(sqlRow, idx + 4),
        getOptionalIntFromSQLRow(sqlRow, idx + 5),
        getOptionalStringFromSQLRow(sqlRow, idx + 6),
        getInt64FromSQLRow(sqlRow, idx + 7)};
  }

  int bindToSQL(sqlite3_stmt *sql, int idx) const {
    bindStringToSQL(id, sql, idx);
    bindOptionalStringToSQL(local_id, sql, idx + 1);
    bindStringToSQL(thread, sql, idx + 2);
    bindStringToSQL(user, sql, idx + 3);
    bindIntToSQL(type, sql, idx + 4);
    bindOptionalIntToSQL(future_type, sql, idx + 5);
    bindOptionalStringToSQL(content, sql, idx + 6);
    return bindInt64ToSQL(time, sql, idx + 7);
  }
};

struct WebMessage {
  std::string id;
  NullableString local_id;
  std::string thread;
  std::string user;
  int type;
  NullableInt future_type;
  NullableString content;
  std::string time;

  WebMessage() = default;

  WebMessage(const Message &message) {
    id = message.id;
    local_id = NullableString(message.local_id);
    thread = message.thread;
    user = message.user;
    type = message.type;
    future_type = NullableInt(message.future_type);
    content = NullableString(message.content);
    time = std::to_string(message.time);
  }

  Message toMessage() const {
    Message message;
    message.id = id;
    message.local_id = local_id.resetValue();
    message.thread = thread;
    message.user = user;
    message.type = type;
    message.future_type = future_type.resetValue();
    message.content = content.resetValue();
    message.time = std::stoll(time);
    return message;
  }
};

struct MessageWithMedias {
  Message message;
  std::vector<Media> medias;
};

struct MessageEntity {
  Message message;
  std::vector<Media> medias;
};

} // namespace comm
