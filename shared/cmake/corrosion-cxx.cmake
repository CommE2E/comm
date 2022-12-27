# Creates a target including rust lib and cxxbridge which is
# named as ${NAMESPACE}::${_LIB_PATH_STEM}
# <_LIB_PATH_STEM> must match the crate name:
# "path/to/myrustcrate" -> "libmyrustcrate.a"
function(add_library_rust)
  set(value_keywords PATH NAMESPACE CXX_BRIDGE_SOURCE_FILE)
  cmake_parse_arguments(
    rust_lib
    "${OPTIONS}"
    "${value_keywords}"
    "${MULTI_value_KEYWORDS}"
    ${ARGN}
  )

  if("${Rust_CARGO_TARGET}" STREQUAL "")
    message(
      FATAL_ERROR
      "Rust_CARGO_TARGET is not detected and empty")
  endif()

  if("${rust_lib_PATH}" STREQUAL "")
    message(
      FATAL_ERROR
      "add_library_rust called without a given path to root of a rust crate")
  endif()

  if("${rust_lib_NAMESPACE}" STREQUAL "")
    message(
      FATAL_ERROR
      "Must supply a namespace given by keyvalue NAMESPACE <value>")
  endif()

  set(rust_lib_SOURCE_FOLDER "src")

  if(NOT EXISTS "${CMAKE_CURRENT_LIST_DIR}/${rust_lib_PATH}/Cargo.toml")
    message(
      FATAL_ERROR
      "${CMAKE_CURRENT_LIST_DIR}/${rust_lib_PATH} doesn't contain a Cargo.toml")
  endif()

  set(lib_path ${rust_lib_PATH})
  set(namespace ${rust_lib_NAMESPACE})
  set(cxx_bridge_source_file "${rust_lib_SOURCE_FOLDER}/lib.rs")

  corrosion_import_crate(MANIFEST_PATH "${lib_path}/Cargo.toml")

  get_filename_component(_LIB_PATH_STEM ${lib_path} NAME)
  message(STATUS "Library stem path: ${_LIB_PATH_STEM}")

  # Set AR env var if it's present (Android-specific)
  if(AR)
    corrosion_set_env_vars(${_LIB_PATH_STEM} "AR=${AR}")
  endif()

  # Resolve directory path which can be consumed globally
  get_filename_component(REALPATH_BINARY_DIR
    "${CMAKE_CURRENT_BINARY_DIR}"
    REALPATH
  )

  # Set cxxbridge values
  set(
    cxx_bridge_binary_folder
    ${REALPATH_BINARY_DIR}/cargo/build/${Rust_CARGO_TARGET}/cxxbridge)
  set(
    common_header
    ${cxx_bridge_binary_folder}/rust/cxx.h)
  # We name the variable dynamically in case a single
  # build has multiple entrypoints into this script
  # cmake-lint: disable=C0103
  set(
    "${_LIB_PATH_STEM}_include_dir"
    ${cxx_bridge_binary_folder}/${_LIB_PATH_STEM}/${rust_lib_SOURCE_FOLDER}
    PARENT_SCOPE)
  set(
    binding_header
    ${${_LIB_PATH_STEM}_include_dir}/${cxx_bridge_source_file}.h)
  set(
    binding_source
    ${cxx_bridge_binary_folder}/${_LIB_PATH_STEM}/${cxx_bridge_source_file}.cc)
  set(
    cxx_binding_include_dir
    ${cxx_bridge_binary_folder})

  # Create cxxbridge target
  add_custom_command(
    OUTPUT
    ${common_header}
    ${binding_header}
    ${binding_source}
    COMMAND
    DEPENDS ${_LIB_PATH_STEM}-static
    COMMENT "Fixing cmake to find source files"
  )
  add_library(${_LIB_PATH_STEM}_cxxbridge
    ${common_header}
    ${binding_header}
    ${binding_source}
  )
  target_include_directories(${_LIB_PATH_STEM}_cxxbridge
    PUBLIC ${cxx_binding_include_dir}
    ${CMAKE_CURRENT_LIST_DIR}/${rust_lib_PATH}
  )

  # Create total target with alias with given namespace
  add_library(${_LIB_PATH_STEM}-total INTERFACE)
  target_link_libraries(${_LIB_PATH_STEM}-total
    INTERFACE
    ${_LIB_PATH_STEM}_cxxbridge
    ${_LIB_PATH_STEM}
  )

  # For end-user to link into project
  add_library(${namespace}::${_LIB_PATH_STEM} ALIAS ${_LIB_PATH_STEM}-total)
endfunction(add_library_rust)
