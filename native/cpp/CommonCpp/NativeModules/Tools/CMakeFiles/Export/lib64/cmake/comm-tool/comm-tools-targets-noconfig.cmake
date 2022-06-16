#----------------------------------------------------------------
# Generated CMake target import file.
#----------------------------------------------------------------

# Commands may need to know the format version.
set(CMAKE_IMPORT_FILE_VERSION 1)

# Import target "comm-tools::comm-tools" for configuration ""
set_property(TARGET comm-tools::comm-tools APPEND PROPERTY IMPORTED_CONFIGURATIONS NOCONFIG)
set_target_properties(comm-tools::comm-tools PROPERTIES
  IMPORTED_LINK_INTERFACE_LANGUAGES_NOCONFIG "CXX"
  IMPORTED_LOCATION_NOCONFIG "${_IMPORT_PREFIX}/lib64/libcomm-tools.a"
  )

list(APPEND _IMPORT_CHECK_TARGETS comm-tools::comm-tools )
list(APPEND _IMPORT_CHECK_FILES_FOR_comm-tools::comm-tools "${_IMPORT_PREFIX}/lib64/libcomm-tools.a" )

# Commands beyond this point should not need to know the version.
set(CMAKE_IMPORT_FILE_VERSION)
