PROJECT(BlobClientApp C CXX)

cmake_minimum_required(VERSION 3.20)

set(CMAKE_RUNTIME_OUTPUT_DIRECTORY bin)
set(CMAKE_CXX_STANDARD 14)
set(PACKAGE_NAME "blob_client_app")

find_package(Corrosion REQUIRED)
include(cmake/corrosion_cxx.cmake)

add_executable(
  ${PACKAGE_NAME}
  blob_client_app.cpp
)

add_library_rust(PATH rust NAMESPACE blob_client)

target_link_libraries(${PACKAGE_NAME} PUBLIC blob_client::rust)

install(
  TARGETS ${PACKAGE_NAME}
  RUNTIME DESTINATION bin/
)