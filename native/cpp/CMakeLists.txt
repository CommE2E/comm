project(comm-cpp)

# 3.13+ required for CMP0079 to be set
cmake_minimum_required(VERSION 3.13)

add_subdirectory(CommonCpp)
add_subdirectory(lib/sqlite_orm)

target_link_libraries(comm-databasemanagers
  comm-tools
  comm-sqlite-orm
  )

