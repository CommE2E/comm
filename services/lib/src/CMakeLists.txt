project(comm-services-common)
cmake_minimum_required(VERSION 3.4)
set(CMAKE_CXX_STANDARD 14)

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
find_package(Boost 1.40 COMPONENTS program_options REQUIRED)
find_package(protobuf REQUIRED)
find_package(glog REQUIRED)
find_package(gRPC REQUIRED)

target_link_libraries(comm-services-common
  glog::glog
  gRPC::grpc++
  ${AWSSDK_LINK_LIBRARIES}
  ${Boost_LIBRARIES}
)

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

set(_pname ${PROJECT_NAME})
export(TARGETS comm-services-common
  NAMESPACE comm-services-common::
  FILE ${CMAKE_CURRENT_BINARY_DIR}/cmake/${_pname}/${_pname}-targets.cmake
)

# For installation
install(EXPORT comm-services-common-export
  FILE comm-services-common-targets.cmake
  DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/comm-services-common
  NAMESPACE comm-services-common::
)
