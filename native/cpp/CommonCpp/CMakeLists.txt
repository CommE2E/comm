project(comm-common-cpp)

# 3.13+ required for CMP0079 to be set
cmake_minimum_required(VERSION 3.13)

include(GNUInstallDirs)

add_subdirectory(Tools)
add_subdirectory(grpc)
add_subdirectory(CryptoTools)
add_subdirectory(NativeModules)

target_link_libraries(comm-client
  comm-modules-internal
)

target_link_libraries(comm-modules-native
  comm-databasemanagers
  comm-tunnelbroker-grpc
  comm-generated
  comm-client
)

target_link_libraries(comm-modules-internal
  comm-tools
  comm-tunnelbroker-grpc
  comm-grpc
  comm-client
)

target_link_libraries(comm-cryptotools
  comm-tools
  )

