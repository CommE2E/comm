add_library(
  # OpenSSL Crypto lib
  openssl-crypto
  STATIC
  IMPORTED
)

set_target_properties(
  # OpenSSL Crypto lib
  openssl-crypto
  PROPERTIES IMPORTED_LOCATION
  "${_third_party_dir}/openssl/openssl-${OPENSSL_VERSION}/build/${CMAKE_ANDROID_ARCH_ABI}/lib/libcrypto.a"
  INTERFACE_INCLUDE_DIRECTORIES "${_third_party_dir}/openssl/openssl-${OPENSSL_VERSION}/build/${CMAKE_ANDROID_ARCH_ABI}/include"
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
  PROPERTIES IMPORTED_LOCATION
  "${_third_party_dir}/openssl/openssl-${OPENSSL_VERSION}/build/${CMAKE_ANDROID_ARCH_ABI}/lib/libssl.a"
  INTERFACE_INCLUDE_DIRECTORIES "${_third_party_dir}/openssl/openssl-${OPENSSL_VERSION}/build/${CMAKE_ANDROID_ARCH_ABI}/include"
)
