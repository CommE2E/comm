project(comm-modules)
cmake_minimum_required(VERSION 3.4)

# For C++17 on MacOS, we must set minimum target to 10.14+
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_OSX_DEPLOYMENT_TARGET 10.14)

include(GNUInstallDirs)

set(NATIVE_HDRS
  "CommCoreModule.h"
  "CommUtilsModule.h"
  "CommRustModule.h"
  "CommConstants.h"
  "NativeModuleUtils.h"
  "MessageStoreOperations.h"
  "ThreadStoreOperations.h"
  "ReportStoreOperations.h"
  "DraftStoreOperations.h"
  "UserStoreOperations.h"
  "KeyserverStoreOperations.h"
  "CommunityStoreOperations.h"
  "IntegrityStoreOperations.h"
  "SyncedMetadataStoreOperations.h"
  "AuxUserStoreOperations.h"
  "ThreadActivityStoreOperations.h"
  "EntryStoreOperations.h"
  "MessageSearchStoreOperations.h"
  "DMOperationStoreOperations.h"
)

set(NATIVE_SRCS
  "CommCoreModule.cpp"
  "CommUtilsModule.cpp"
  "CommRustModule.cpp"
  "CommConstants.cpp"
)

add_library(comm-modules-native
  ${NATIVE_HDRS}
  ${NATIVE_SRCS}
)

set_target_properties(comm-modules-native PROPERTIES LINKER_LANGUAGE CXX)
target_compile_options(comm-modules-native PRIVATE -Wc++17-extensions)

# reference local directory when building, use installation path when installing
target_include_directories(comm-modules-native
  PUBLIC
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}>
  $<INSTALL_INTERFACE:${CMAKE_INSTALL_INCLUDEDIR}>

  # HACK
  PRIVATE
  "../../../../node_modules/react-native/ReactCommon/jsi"
  "../../../../node_modules/react-native/ReactCommon/react/nativemodule/core"
  "../../../../node_modules/react-native/ReactCommon/callinvoker"
  "../../../../node_modules/react-native/ReactCommon"
  "../../../native_rust_library"
)

set(_message_path ./PersistentStorageUtilities/MessageOperationsUtilities)
set(MESSAGE_HDRS
  ${_message_path}/MessageOperationsUtilities.h
  ${_message_path}/MessageSpecs.h
)

set(MESSAGE_SRCS
  ${_message_path}/MessageOperationsUtilities.cpp
)

file(GLOB MESSAGE_SPEC_HDRS
  ${_message_path}/MessageSpecs/*.h
)

file(GLOB THREAD_OP_HDRS
  ./PersistentStorageUtilities/ThreadOperationsUtilities/*.h
)
set(THREAD_OP_SRCS
  ./PersistentStorageUtilities/ThreadOperationsUtilities/ThreadOperations.cpp
)

set(_data_stores_path ./PersistentStorageUtilities/DataStores)
set(DATA_STORES_HDRS
  ${_data_stores_path}/BaseDataStore.h
  ${_data_stores_path}/DraftStore.h
  ${_data_stores_path}/ThreadStore.h
  ${_data_stores_path}/MessageStore.h
  ${_data_stores_path}/ReportStore.h
  ${_data_stores_path}/UserStore.h
  ${_data_stores_path}/KeyserverStore.h
  ${_data_stores_path}/CommunityStore.h
  ${_data_stores_path}/IntegrityStore.h
  ${_data_stores_path}/SyncedMetadataStore.h
  ${_data_stores_path}/AuxUserStore.h
  ${_data_stores_path}/ThreadActivityStore.h
  ${_data_stores_path}/EntryStore.h
  ${_data_stores_path}/MessageSearchStore.h
  ${_data_stores_path}/DMOperationStore.h
)
set(DATA_STORES_SRCS
  ${_data_stores_path}/DraftStore.cpp
  ${_data_stores_path}/ThreadStore.cpp
  ${_data_stores_path}/MessageStore.cpp
  ${_data_stores_path}/ReportStore.cpp
  ${_data_stores_path}/UserStore.cpp
  ${_data_stores_path}/KeyserverStore.cpp
  ${_data_stores_path}/CommunityStore.cpp
  ${_data_stores_path}/IntegrityStore.cpp
  ${_data_stores_path}/SyncedMetadataStore.cpp
  ${_data_stores_path}/AuxUserStore.cpp
  ${_data_stores_path}/ThreadActivityStore.cpp
  ${_data_stores_path}/EntryStore.cpp
  ${_data_stores_path}/MessageSearchStore.cpp
  ${_data_stores_path}/DMOperationStore.cpp
)

set(_backup_op_path ./PersistentStorageUtilities/BackupOperationsUtilities)
set(BACKUP_OP_HDRS
  ${_backup_op_path}/BackupOperationsExecutor.h
)
set(BACKUP_OP_SRCS
  ${_backup_op_path}/BackupOperationsExecutor.cpp
)

add_library(comm-modules-persistentstorage
  ${MESSAGE_HDRS}
  ${MESSAGE_SRCS}
  ${MESSAGE_SPEC_HDRS}
  ${THREAD_OP_HDRS}
  ${THREAD_OP_SRCS}
  ${DATA_STORES_HDRS}
  ${DATA_STORES_SRCS}
  ${BACKUP_OP_HDRS}
  ${BACKUP_OP_SRCS}
)

# reference local directory when building, use installation path when installing
target_include_directories(comm-modules-persistentstorage
  PUBLIC
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}>
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/../Tools>
  $<INSTALL_INTERFACE:${CMAKE_INSTALL_INCLUDEDIR}>
  PRIVATE

  # HACK
  "../../../node_modules/react-native/ReactCommon/jsi"
)
