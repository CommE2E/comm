#include "jniHelpers.h"
#include <Tools/AESCrypto.h>
#include <fbjni/ByteBuffer.h>
#include <fbjni/fbjni.h>

using namespace facebook::jni;

class AESCryptoJavaClass : public JavaClass<AESCryptoJavaClass> {
public:
  // app.comm.android.aescrypto.AESCryptoModuleCompat
  static auto constexpr kJavaDescriptor =
      "Lapp/comm/android/aescrypto/AESCryptoModuleCompat;";

  static void generateKey(rust::Slice<uint8_t> buffer) {
    local_ref<JByteBuffer> byteBuffer =
        JByteBuffer::wrapBytes(buffer.data(), buffer.size());

    static const auto cls = javaClassStatic();
    static auto method =
        cls->getStaticMethod<void(local_ref<JByteBuffer>)>("generateKey");
    method(cls, byteBuffer);
  }

  static void encrypt(
      rust::Slice<uint8_t> key,
      rust::Slice<uint8_t> plaintext,
      rust::Slice<uint8_t> sealedData) {
    local_ref<JByteBuffer> keyBuffer =
        JByteBuffer::wrapBytes(key.data(), key.size());
    local_ref<JByteBuffer> plaintextBuffer =
        JByteBuffer::wrapBytes(plaintext.data(), plaintext.size());
    local_ref<JByteBuffer> sealedDataBuffer =
        JByteBuffer::wrapBytes(sealedData.data(), sealedData.size());
    static const auto cls = javaClassStatic();
    static auto method = cls->getStaticMethod<void(
        local_ref<JByteBuffer>,
        local_ref<JByteBuffer>,
        local_ref<JByteBuffer>)>("encrypt");
    method(cls, keyBuffer, plaintextBuffer, sealedDataBuffer);
  }

  static void decrypt(
      rust::Slice<uint8_t> key,
      rust::Slice<uint8_t> sealedData,
      rust::Slice<uint8_t> plaintext) {
    local_ref<JByteBuffer> keyBuffer =
        JByteBuffer::wrapBytes(key.data(), key.size());
    local_ref<JByteBuffer> sealedDataBuffer =
        JByteBuffer::wrapBytes(sealedData.data(), sealedData.size());
    local_ref<JByteBuffer> plaintextBuffer =
        JByteBuffer::wrapBytes(plaintext.data(), plaintext.size());
    static const auto cls = javaClassStatic();
    static auto method = cls->getStaticMethod<void(
        local_ref<JByteBuffer>,
        local_ref<JByteBuffer>,
        local_ref<JByteBuffer>)>("decrypt");
    method(cls, keyBuffer, sealedDataBuffer, plaintextBuffer);
  }
};

namespace comm {

std::string AESCrypto::generateKey(rust::Slice<uint8_t> buffer) {
  NativeAndroidAccessProvider::runTask(
      [&]() { AESCryptoJavaClass::generateKey(buffer); });
  return std::string();
}

std::string AESCrypto::encrypt(
    rust::Slice<uint8_t> key,
    rust::Slice<uint8_t> plaintext,
    rust::Slice<uint8_t> sealedData) {
  NativeAndroidAccessProvider::runTask(
      [&]() { AESCryptoJavaClass::encrypt(key, plaintext, sealedData); });
  return std::string();
}

std::string AESCrypto::decrypt(
    rust::Slice<uint8_t> key,
    rust::Slice<uint8_t> sealedData,
    rust::Slice<uint8_t> plaintext) {
  NativeAndroidAccessProvider::runTask(
      [&]() { AESCryptoJavaClass::decrypt(key, sealedData, plaintext); });
  return std::string();
}

} // namespace comm
