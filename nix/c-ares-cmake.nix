{ lib, stdenv, c-ares, writeTextFile }:

let
  extension = if stdenv.hostPlatform.isStatic then ".a" else stdenv.hostPlatform.extensions.sharedLibrary;
  buildType = if stdenv.hostPlatform.isStatic then "STATIC" else "SHARED";
  buildTypeLower = if stdenv.hostPlatform.isStatic then "static" else "shared";
in writeTextFile {
  name = "c-ares-cmake-config";
  destination = "/lib/cmake/c-ares/c-ares-config.cmake";
  text = ''
    set(c-ares_INCLUDE_DIR "${c-ares}/include")
    set(c-ares_LIBRARY c-ares::cares)
    add_library(c-ares::cares ${buildType} IMPORTED)
    set_target_properties(c-ares::cares PROPERTIES
      INTERFACE_INCLUDE_DIRECTORIES "${c-ares}/include"
    )
    set_property(TARGET c-ares::cares APPEND PROPERTY IMPORTED_CONFIGURATIONS RELEASE)
    set_target_properties(c-ares::cares PROPERTIES
      IMPORTED_LOCATION_RELEASE "${c-ares}/lib/libcares${extension}"
      IMPORTED_SONAME_RELEASE "libcares${extension}"
      )
    add_library(c-ares::cares_${buildTypeLower} INTERFACE IMPORTED)
    set_target_properties(c-ares::cares_${buildTypeLower} PROPERTIES INTERFACE_LINK_LIBRARIES "c-ares::cares")
    set(c-ares_${buildType}_LIBRARY c-ares::cares_${buildTypeLower})
  '';
}
