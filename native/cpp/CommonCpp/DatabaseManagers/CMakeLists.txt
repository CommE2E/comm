project(comm-databasemanagers)
cmake_minimum_required(VERSION 3.4)

include(GNUInstallDirs)

set(DBM_HDRS
  "DatabaseManager.h"
  "DatabaseQueryExecutor.h"
  "SQLiteQueryExecutor.h"
  "SQLiteUtils.h"
  "SQLiteSchema.h"
  "SQLiteBackup.h"
  "SQLiteConnectionManager.h"
  "NativeSQLiteConnectionManager.h"
  "entities/SQLiteStatementWrapper.h"
  "entities/EntityQueryHelpers.h"
  "entities/SQLiteDataConverters.h"
  "entities/Draft.h"
  "entities/Holder.h"
  "entities/Media.h"
  "entities/Message.h"
  "entities/Metadata.h"
  "entities/OlmPersistAccount.h"
  "entities/OlmPersistSession.h"
  "entities/Thread.h"
)

set(DBM_SRCS
  "SQLiteQueryExecutor.cpp"
  "SQLiteUtils.cpp"
  "SQLiteSchema.cpp"
  "SQLiteSchemaMigrations.cpp"
  "SQLiteBackup.cpp"
  "SQLiteConnectionManager.cpp"
  "NativeSQLiteConnectionManager.cpp"
  "entities/SQLiteDataConverters.cpp"
  "entities/SQLiteStatementWrapper.cpp"
)

add_library(comm-databasemanagers
  ${DBM_HDRS}
  ${DBM_SRCS}
)

target_include_directories(comm-databasemanagers
  PUBLIC
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}>
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/..>
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/../Tools>
  $<INSTALL_INTERFACE:${CMAKE_INSTALL_INCLUDEDIR}>
  PRIVATE
  # HACK
  "../../../node_modules/react-native/ReactCommon/jsi"
  "../../../node_modules/olm/include"
)

target_link_libraries(comm-databasemanagers
  Folly::folly
)
