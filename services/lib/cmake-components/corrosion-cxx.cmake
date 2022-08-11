function(detect_cargo_target_architecture)
  find_program(Rust_COMPILER rustc)
  find_program(Sed_PATH sed)

  if(NOT Rust_COMPILER)
    message(
      FATAL "The rustc executable was not found")
  endif()

  if(NOT Sed_PATH)
    message(
      FATAL "The sed executable was not found")
  endif()

  execute_process(
    COMMAND ${Rust_COMPILER} --version --verbose
    COMMAND ${Sed_PATH} -n "s|host: ||p"
    OUTPUT_VARIABLE DETECTED_CARGO_TARGET
    OUTPUT_STRIP_TRAILING_WHITESPACE)

  if("${DETECTED_CARGO_TARGET}" STREQUAL "")
    message(FATAL_ERROR "Cannot detect target architecture for cargo build")
  endif()

  message("Cargo target architecture detected as: ${DETECTED_CARGO_TARGET}")
  set(Rust_CARGO_TARGET ${DETECTED_CARGO_TARGET} PARENT_SCOPE)
endfunction(detect_cargo_target_architecture)

function(add_library_rust)
  detect_cargo_target_architecture()
  set(ONE_VALUE_KEYWORDS PATH NAMESPACE CXX_BRIDGE_SOURCE_FILE)
  cmake_parse_arguments(
    _RUST_LIB
    "${OPTIONS}"
    "${ONE_VALUE_KEYWORDS}"
    "${MULTI_VALUE_KEYWORDS}"
    ${ARGN})

  if("${_RUST_LIB_PATH}" STREQUAL "")
    message(
      FATAL_ERROR
      "add_library_rust called without a given path to root of a rust crate")
  endif()

  if("${_RUST_LIB_NAMESPACE}" STREQUAL "")
    message(
      FATAL_ERROR
      "Must supply a namespace given by keyvalue NAMESPACE <value>")
  endif()

  if("${_RUST_LIB_CXX_BRIDGE_SOURCE_FILE}" STREQUAL "")
    set(_RUST_LIB_CXX_BRIDGE_SOURCE_FILE "src/lib.rs")
  endif()

  if(NOT EXISTS "${CMAKE_CURRENT_LIST_DIR}/${_RUST_LIB_PATH}/Cargo.toml")
    message(
      FATAL_ERROR
      "${CMAKE_CURRENT_LIST_DIR}/${_RUST_LIB_PATH} does not contain a Cargo.toml")
  endif()

  set(_LIB_PATH ${_RUST_LIB_PATH})
  set(_NAMESPACE ${_RUST_LIB_NAMESPACE})
  set(_CXX_BRIDGE_SOURCE_FILE ${_RUST_LIB_CXX_BRIDGE_SOURCE_FILE})

  corrosion_import_crate(MANIFEST_PATH "${_LIB_PATH}/Cargo.toml")

  # Set cxxbridge values
  _get_stem_name_of_path(PATH ${_LIB_PATH})
  set(_LIB_PATH_STEM ${STEM_OF_PATH})

  set(
    CXXBRIDGE_BINARY_FOLDER
    ${CMAKE_BINARY_DIR}/cargo/build/${Rust_CARGO_TARGET}/cxxbridge)
  set(
    COMMON_HEADER
    ${CXXBRIDGE_BINARY_FOLDER}/rust/cxx.h)
  set(
    BINDING_HEADER
    ${CXXBRIDGE_BINARY_FOLDER}/${_LIB_PATH_STEM}/${_CXX_BRIDGE_SOURCE_FILE}.h)
  set(
    BINDING_SOURCE
    ${CXXBRIDGE_BINARY_FOLDER}/${_LIB_PATH_STEM}/${_CXX_BRIDGE_SOURCE_FILE}.cc)
  set(
    CXX_BINDING_INCLUDE_DIR
    ${CXXBRIDGE_BINARY_FOLDER})

  # Create cxxbridge target
  add_custom_command(
    DEPENDS ${_LIB_PATH_STEM}-static
    OUTPUT
    ${COMMON_HEADER}
    ${BINDING_HEADER}
    ${BINDING_SOURCE}
  )

  add_library(${_LIB_PATH_STEM}_cxxbridge)
  target_sources(${_LIB_PATH_STEM}_cxxbridge
    PUBLIC
    ${COMMON_HEADER}
    ${BINDING_HEADER}
    ${BINDING_SOURCE}
  )
  target_include_directories(${_LIB_PATH_STEM}_cxxbridge
    PUBLIC
    ${CXX_BINDING_INCLUDE_DIR}
  )

  # Create total target with alias with given namespace
  add_library(${_LIB_PATH_STEM}-total INTERFACE)
  target_link_libraries(${_LIB_PATH_STEM}-total
    INTERFACE
    ${_LIB_PATH_STEM}_cxxbridge
    ${_LIB_PATH_STEM}
  )

  # for end-user to link into project
  add_library(${_NAMESPACE}::${_LIB_PATH_STEM} ALIAS ${_LIB_PATH_STEM}-total)
endfunction(add_library_rust)

function(_get_stem_name_of_path)
  set(ONE_VALUE_KEYWORDS PATH)
  cmake_parse_arguments(
    _PATH_STEM
    "${OPTIONS}"
    "${ONE_VALUE_KEYWORDS}"
    "${MULTI_VALUE_KEYWORDS}"
    ${ARGN})

  if("${_PATH_STEM_PATH}" STREQUAL "")
    message(
      FATAL_ERROR
      "Path to get stem for is empty")
  endif()

  set(_PATH ${_PATH_STEM_PATH})

  # Convert to list
  string(REPLACE "/" ";" _PATH_AS_LIST ${_PATH})
  list(LENGTH _PATH_AS_LIST LIST_LENGTH)
  math(EXPR INDEX "${LIST_LENGTH} - 1" OUTPUT_FORMAT DECIMAL)
  list(GET _PATH_AS_LIST "${INDEX}" _STEM)
  set(STEM_OF_PATH ${_STEM} PARENT_SCOPE)
endfunction(_get_stem_name_of_path)
