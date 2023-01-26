find_library(
  folly-lib
  folly_runtime
  PATHS ${LIBRN_DIR}
  NO_CMAKE_FIND_ROOT_PATH
)

list(APPEND _folly_includes
  "${_third_party_dir}/folly"
  "${_third_party_dir}/boost/boost_${BOOST_VERSION}"
  "${_third_party_dir}/double-conversion"
  "${_third_party_dir}/glog/glog-${GLOG_VERSION}"
)

list(APPEND _folly_options
  -DFOLLY_NO_CONFIG=1
  -DFOLLY_HAVE_CLOCK_GETTIME=1
  -DFOLLY_HAVE_MEMRCHR=1
  -DFOLLY_USE_LIBCPP=1
  -DFOLLY_MOBILE=1
)

add_library(Folly::folly SHARED IMPORTED)
set_target_properties(Folly::folly PROPERTIES
  IMPORTED_LOCATION "${folly-lib}"
  INTERFACE_INCLUDE_DIRECTORIES "${_folly_includes}"
  INTERFACE_LINK_LIBRARIES glog::glog
  INTERFACE_COMPILE_OPTIONS "${_folly_options}"
)
