project(comm-client-base-reactors CXX C)
cmake_minimum_required(VERSION 3.10)

include(GNUInstallDirs)

set(CLIENT_HDRS
  ClientWriteReactorBase.h
  ClientBidiReactorBase.h
  ClientReadReactorBase.h
)

add_library(comm-client-base-reactors
  INTERFACE
)

target_include_directories(comm-client-base-reactors
  INTERFACE
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}>
  $<INSTALL_INTERFACE:${CMAKE_INSTALL_INCLUDEDIR}>
)

install(TARGETS comm-client-base-reactors
  EXPORT comm-client-base-reactors-export
  RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR}
    COMPONENT comm-client-base-reactors
  LIBRARY DESTINATION ${CMAKE_INSTALL_LIBDIR}
    COMPONENT comm-client-base-reactors
  ARCHIVE DESTINATION ${CMAKE_INSTALL_LIBDIR}
    COMPONENT comm-client-base-reactors
)

install(FILES ${COMMON_HDRS} DESTINATION include)

set(_pname ${PROJECT_NAME})
export(TARGETS comm-client-base-reactors
  NAMESPACE comm-client-base-reactors::
  FILE ${CMAKE_CURRENT_BINARY_DIR}/cmake/${_pname}/${_pname}-targets.cmake
)

install(EXPORT comm-client-base-reactors-export
  FILE comm-client-base-reactors-targets.cmake
  DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/comm-client-base-reactors
  NAMESPACE comm-client-base-reactors::
)
