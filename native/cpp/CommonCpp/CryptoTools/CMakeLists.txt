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
  STATIC
  ${CRYPTO_HDRS}
  ${CRYPTO_SRCS}
)

target_link_libraries(comm-cryptotools
  Olm::Olm
)

# reference local directory when building, use installation path when installing
target_include_directories(comm-cryptotools
  PUBLIC
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/..>
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/>
  $<INSTALL_INTERFACE:${CMAKE_INSTALL_INCLUDEDIR}>
)
