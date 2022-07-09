project(comm-server-base-reactors CXX C)
cmake_minimum_required(VERSION 3.10)

include(GNUInstallDirs)

file(GLOB SERVER_HDRS
  ${CMAKE_CURRENT_SOURCE_DIR}/*.h
)

add_library(comm-server-base-reactors
  INTERFACE # There's nothing to "build" with headers, so just export them
)

target_include_directories(comm-server-base-reactors
  INTERFACE
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}>
  $<INSTALL_INTERFACE:${CMAKE_INSTALL_INCLUDEDIR}>
)

install(TARGETS comm-server-base-reactors
  EXPORT comm-server-base-reactors-export
  RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR}
    COMPONENT comm-server-base-reactors
  LIBRARY DESTINATION ${CMAKE_INSTALL_LIBDIR}
    COMPONENT comm-server-base-reactors
  ARCHIVE DESTINATION ${CMAKE_INSTALL_LIBDIR}
    COMPONENT comm-server-base-reactors
)

install(FILES ${COMMON_HDRS} DESTINATION include)

set(_pname ${PROJECT_NAME})
export(TARGETS comm-server-base-reactors
  NAMESPACE comm-server-base-reactors::
  FILE ${CMAKE_CURRENT_BINARY_DIR}/cmake/${_pname}/${_pname}-targets.cmake
)

install(EXPORT comm-server-base-reactors-export
  FILE comm-server-base-reactors-targets.cmake
  DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/comm-server-base-reactors
  NAMESPACE comm-server-base-reactors::
)
