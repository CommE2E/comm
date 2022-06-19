project(comm-cryptotools)
cmake_minimum_required(VERSION 3.4)

include(GNUInstallDirs)

set(CMAKE_CXX_STANDARD 14)

set(CRYPTO_HDRS
  "CryptoModule.h"
  "Persist.h"
  "Session.h"
  "Tools.h"
)

set(CRYPTO_SRCS
  "CryptoModule.cpp"
  "Session.cpp"
  "Tools.cpp"
)

add_library(comm-cryptotools
  ${CRYPTO_HDRS}
  ${CRYPTO_SRCS}
)

find_package(Olm)

target_link_libraries(comm-cryptotools
  Olm::Olm
)

# reference local directory when building, use installation path when installing
target_include_directories(comm-cryptotools
  PUBLIC
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/..>
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/../Tools>
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/>
  $<INSTALL_INTERFACE:${CMAKE_INSTALL_INCLUDEDIR}>
)

install(TARGETS comm-cryptotools EXPORT comm-cryptotools-export
  RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR} COMPONENT comm-cryptotools
  LIBRARY DESTINATION ${CMAKE_INSTALL_LIBDIR} COMPONENT comm-cryptotools
  ARCHIVE DESTINATION ${CMAKE_INSTALL_LIBDIR} COMPONENT comm-cryptotools
)

install(FILES ${TOOLS_HDRS} DESTINATION include/Tools)

set(_builddir_export_path cmake/comm-cryptotools/comm-cryptotools-targets.cmake)
export(TARGETS comm-cryptotools
  NAMESPACE comm-cryptotools::
  FILE ${CMAKE_CURRENT_BINARY_DIR}/${_builddir_export_path}
)

# For installation
install(EXPORT comm-cryptotools-export
  FILE comm-cryptotools-targets.cmake
  DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/comm-cryptotools
  NAMESPACE comm-cryptotools::
)
