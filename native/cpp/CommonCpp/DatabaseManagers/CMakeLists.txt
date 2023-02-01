project(comm-databasemanagers)
cmake_minimum_required(VERSION 3.4)

include(GNUInstallDirs)

set(DBM_HDRS
  "DatabaseManager.h"
  "DatabaseQueryExecutor.h"
  "SQLiteQueryExecutor.h"
  "entities/Draft.h"
  "entities/Media.h"
  "entities/Message.h"
  "entities/Metadata.h"
  "entities/OlmPersistAccount.h"
  "entities/OlmPersistSession.h"
  "entities/Thread.h"
)

set(DBM_SRCS
  "SQLiteQueryExecutor.cpp"
  "DatabaseManager.cpp"
)

add_library(comm-databasemanagers
  STATIC
  ${DBM_HDRS}
  ${DBM_SRCS}
)

target_include_directories(comm-databasemanagers
  PUBLIC
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}>
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/..>
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/../Tools>
  $<INSTALL_INTERFACE:${CMAKE_INSTALL_INCLUDEDIR}>
  # TODO: Remove once native/cpp has a CMakeLists.txt
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/../../third-party/sqlite_orm>
  PRIVATE
  # HACK
  "../../../node_modules/react-native/ReactCommon/jsi"
  "../../../node_modules/olm/include"
  "../../../node_modules/@commapp/sqlcipher-amalgamation/src/"
)

target_link_libraries(comm-databasemanagers
  Folly::folly
  fbjni::fbjni
)
