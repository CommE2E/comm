project(comm-common-cpp)

# 3.13+ required for CMP0079 to be set
cmake_minimum_required(VERSION 3.13)

include(GNUInstallDirs)

add_subdirectory(grpc)
add_subdirectory(CryptoTools)
add_subdirectory(DatabaseManagers)
add_subdirectory(NativeModules)
add_subdirectory(Tools)

target_link_libraries(comm-client
  comm-modules-native
)

target_link_libraries(comm-cryptotools
  comm-tools
  comm-databasemanagers
)

target_link_libraries(comm-modules-internal
  comm-tools
  comm-client
)

target_link_libraries(comm-modules-native
  comm-client
  comm-cryptotools
  comm-databasemanagers
  comm-tools
)

target_link_libraries(comm-modules-persistentstorage
  comm-databasemanagers
  comm-client
)
