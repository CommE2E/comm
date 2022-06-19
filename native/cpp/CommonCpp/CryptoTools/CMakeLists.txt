project(comm-cryptotools)
cmake_minimum_required(VERSION 3.4)

include(GNUInstallDirs)

set(CRYPTO_HDRS
  "include/comm/CryptoTools/CryptoModule.h"
  "include/comm/CryptoTools/Persist.h"
  "include/comm/CryptoTools/Session.h"
  "include/comm/CryptoTools/Tools.h"
  )

set(CRYPTO_SRCS
  "src/CryptoModule.cpp"
  "src/Session.cpp"
  "src/Tools.cpp"
  )

add_library(comm-cryptotools
  ${CRYPTO_HDRS}
  ${CRYPTO_SRCS}
)

find_package(Olm)

target_link_libraries(comm-cryptotools
  Olm
  )

# reference local directory when building, use installation path when installing
target_include_directories(comm-cryptotools
  PUBLIC
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
  $<INSTALL_INTERFACE:${CMAKE_INSTALL_INCLUDEDIR}>
)

install(TARGETS comm-cryptotools EXPORT comm-cryptotools-export
  RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR} COMPONENT comm-cryptotools
  LIBRARY DESTINATION ${CMAKE_INSTALL_LIBDIR} COMPONENT comm-cryptotools
  ARCHIVE DESTINATION ${CMAKE_INSTALL_LIBDIR} COMPONENT comm-cryptotools
)

install(FILES ${TOOLS_HDRS} DESTINATION include/comm/Tools)

# For development purposes, can point cmake to this directory if doing development
export(TARGETS comm-cryptotools
  NAMESPACE comm-cryptotools::
  FILE ${CMAKE_CURRENT_BINARY_DIR}/cmake/comm-cryptotools/comm-cryptotools-targets.cmake
)

# For installation
install(EXPORT comm-cryptotools-export
  FILE comm-cryptotools-targets.cmake
  DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/comm-cryptotools
  NAMESPACE comm-cryptotools::
)
