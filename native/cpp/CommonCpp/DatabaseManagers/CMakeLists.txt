project(comm-databasemanagers)
cmake_minimum_required(VERSION 3.4)

include(GNUInstallDirs)

set(DBM_HDRS
  "include/comm/DatabaseManagers/DatabaseManager.h"
  "include/comm/DatabaseManagers/DatabaseQueryExecutor.h"
  "include/comm/DatabaseManagers/SQLiteQueryExecutor.h"
  "include/comm/DatabaseManagers/entities/Draft.h"
  "include/comm/DatabaseManagers/entities/Media.h"
  "include/comm/DatabaseManagers/entities/Message.h"
  "include/comm/DatabaseManagers/entities/Metadata.h"
  "include/comm/DatabaseManagers/entities/OlmPersistAccount.h"
  "include/comm/DatabaseManagers/entities/OlmPersistSession.h"
  "include/comm/DatabaseManagers/entities/Thread.h"
  )

set(DBM_SRCS
  "src/SQLiteQueryExecutor.cpp"
  )

add_library(comm-databasemanagers
  ${DBM_HDRS}
  ${DBM_SRCS}
)

# reference local directory when building, use installation path when installing
target_include_directories(comm-databasemanagers
  PUBLIC
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
  $<INSTALL_INTERFACE:${CMAKE_INSTALL_INCLUDEDIR}>
  PRIVATE
  # HACK
  "../../../node_modules/react-native/ReactCommon/jsi"
)

install(TARGETS comm-databasemanagers EXPORT comm-databasemanagers-export
  RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR} COMPONENT comm-databasemanagers
  LIBRARY DESTINATION ${CMAKE_INSTALL_LIBDIR} COMPONENT comm-databasemanagers
  ARCHIVE DESTINATION ${CMAKE_INSTALL_LIBDIR} COMPONENT comm-databasemanagers
)

install(FILES ${TOOLS_HDRS} DESTINATION include/comm/DatabaseManagers)

# For development purposes, can point cmake to this directory if doing development
export(TARGETS comm-databasemanagers
  NAMESPACE comm-databasemanagers::
  FILE ${CMAKE_CURRENT_BINARY_DIR}/cmake/comm-tools/comm-databasemanagers-targets.cmake
)

# For installation
install(EXPORT comm-databasemanagers-export
  DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/comm-databasemanagers
  NAMESPACE comm-tools::
)
