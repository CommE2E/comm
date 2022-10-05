project(comm-sqlite-orm)
cmake_minimum_required(VERSION 3.4)

include(GNUInstallDirs)

find_package(PkgConfig)
pkg_check_modules(sqlite REQUIRED sqlite3)

set(SQLITE_HDRS
  "sqlite_orm.h"
)

add_library(comm-sqlite-orm
  INTERFACE
  ${SQLITE_HDRS}
)

# Reference local directory when building, use installation path when installing
target_include_directories(comm-sqlite-orm
  PUBLIC INTERFACE
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}>
  $<INSTALL_INTERFACE:${CMAKE_INSTALL_INCLUDEDIR}>
)

install(TARGETS comm-sqlite-orm EXPORT comm-sqlite-orm-export
  RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR} COMPONENT comm-sqlite-orm
  LIBRARY DESTINATION ${CMAKE_INSTALL_LIBDIR} COMPONENT comm-sqlite-orm
  ARCHIVE DESTINATION ${CMAKE_INSTALL_LIBDIR} COMPONENT comm-sqlite-orm
)

install(FILES ${SQLITE_HDRS} DESTINATION include)

set(_cmake_dir "cmake/comm-sqlite-orm")
export(TARGETS comm-sqlite-orm
  NAMESPACE comm-sqlite-orm::
  FILE ${CMAKE_CURRENT_BINARY_DIR}/${_cmake_dir}/comm-sqlite-orm-targets.cmake
)

# For installation
install(EXPORT comm-sqlite-orm-export
  DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/comm-sqlite-orm
  NAMESPACE comm-sqlite-orm::
)
