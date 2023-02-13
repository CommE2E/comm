set(OPENSSL_DIR "${_third_party_dir}/openssl/openssl-${OPENSSL_VERSION}")
SET(OPENSSL_BUILD_DIR "${OPENSSL_DIR}/build/${CMAKE_ANDROID_ARCH_ABI}")

add_library(
  # OpenSSL Crypto lib
  openssl-crypto
  STATIC
  IMPORTED
)

set_target_properties(
  # OpenSSL Crypto lib
  openssl-crypto
  PROPERTIES IMPORTED_LOCATION "${OPENSSL_BUILD_DIR}/lib/libcrypto.a"
  INTERFACE_INCLUDE_DIRECTORIES "${OPENSSL_BUILD_DIR}/include"
)

add_library(
  # OpenSSL SSL lib
  openssl-ssl
  STATIC
  IMPORTED
)

set_target_properties(
  # OpenSSL SSL lib
  openssl-ssl
  PROPERTIES IMPORTED_LOCATION "${OPENSSL_BUILD_DIR}/lib/libssl.a"
  INTERFACE_INCLUDE_DIRECTORIES "${OPENSSL_BUILD_DIR}/include"
)
