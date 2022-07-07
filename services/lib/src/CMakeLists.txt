project(comm-services-common)
cmake_minimum_required(VERSION 3.4)

include(GNUInstallDirs)

# Export reactors
add_subdirectory(${CMAKE_CURRENT_SOURCE_DIR}/client-base-reactors)
add_subdirectory(${CMAKE_CURRENT_SOURCE_DIR}/server-base-reactors)

file(GLOB COMMON_HDRS
  ${CMAKE_CURRENT_SOURCE_DIR}/*.h
)

file(GLOB COMMON_SRCS
  ${CMAKE_CURRENT_SOURCE_DIR}/*.cpp
)

add_library(comm-services-common
  ${COMMON_HDRS}
  ${COMMON_SRCS}
)

find_package(AWSSDK REQUIRED COMPONENTS core dynamodb)
find_package(protobuf REQUIRED)
find_package(gRPC REQUIRED)

target_link_libraries(comm-services-common
  gRPC::grpc++
  ${AWSSDK_LINK_LIBRARIES}
)

# reference local directory when building, use installation path when installing
target_include_directories(comm-services-common
  PUBLIC
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}>
  $<INSTALL_INTERFACE:${CMAKE_INSTALL_INCLUDEDIR}>
)

install(TARGETS comm-services-common EXPORT comm-services-common-export
  RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR} COMPONENT comm-services-common
  LIBRARY DESTINATION ${CMAKE_INSTALL_LIBDIR} COMPONENT comm-services-common
  ARCHIVE DESTINATION ${CMAKE_INSTALL_LIBDIR} COMPONENT comm-services-common
)

install(FILES ${COMMON_HDRS} DESTINATION include)

# For development purposes, can point cmake to this directory if doing development
export(TARGETS comm-services-common
  NAMESPACE comm-services-common::
  FILE ${CMAKE_CURRENT_BINARY_DIR}/cmake/comm-services-common/comm-services-common-targets.cmake
)

# For installation
install(EXPORT comm-services-common-export
  FILE comm-services-common-targets.cmake
  DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/comm-tool
  NAMESPACE comm-services-common::
)
