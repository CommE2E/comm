#include "jniHelpers.h"
#include <Tools/AESCrypto.h>
#include <fbjni/ByteBuffer.h>
#include <fbjni/fbjni.h>

using namespace facebook::jni;

template <typename T>
class AESCryptoJavaClass : public JavaClass<AESCryptoJavaClass<T>> {
public:
  // app.comm.android.aescrypto.AESCryptoModuleCompat
  static auto constexpr kJavaDescriptor =
      "Lapp/comm/android/aescrypto/AESCryptoModuleCompat;";

  using JavaClass<AESCryptoJavaClass<T>>::javaClassStatic;

  static void generateKey(T buffer) {
    local_ref<JByteBuffer> byteBuffer =
        JByteBuffer::wrapBytes(buffer.data(), buffer.size());

    static const auto cls = javaClassStatic();
    static auto method =
        cls->template getStaticMethod<void(alias_ref<JByteBuffer>)>(
            "generateKey");
    method(cls, byteBuffer);
  }

  static void encrypt(T key, T plaintext, T sealedData) {
    local_ref<JByteBuffer> keyBuffer =
        JByteBuffer::wrapBytes(key.data(), key.size());
    local_ref<JByteBuffer> plaintextBuffer =
        JByteBuffer::wrapBytes(plaintext.data(), plaintext.size());
    local_ref<JByteBuffer> sealedDataBuffer =
        JByteBuffer::wrapBytes(sealedData.data(), sealedData.size());
    static const auto cls = javaClassStatic();
    static auto method = cls->template getStaticMethod<void(
        alias_ref<JByteBuffer>,
        alias_ref<JByteBuffer>,
        alias_ref<JByteBuffer>)>("encrypt");
    method(cls, keyBuffer, plaintextBuffer, sealedDataBuffer);
  }

  static void decrypt(T key, T sealedData, T plaintext) {
    local_ref<JByteBuffer> keyBuffer =
        JByteBuffer::wrapBytes(key.data(), key.size());
    local_ref<JByteBuffer> sealedDataBuffer =
        JByteBuffer::wrapBytes(sealedData.data(), sealedData.size());
    local_ref<JByteBuffer> plaintextBuffer =
        JByteBuffer::wrapBytes(plaintext.data(), plaintext.size());
    static const auto cls = javaClassStatic();
    static auto method = cls->template getStaticMethod<void(
        alias_ref<JByteBuffer>,
        alias_ref<JByteBuffer>,
        alias_ref<JByteBuffer>)>("decrypt");
    method(cls, keyBuffer, sealedDataBuffer, plaintextBuffer);
  }
};

namespace comm {

template <typename T> void AESCrypto<T>::generateKey(T buffer) {
  NativeAndroidAccessProvider::runTask(
      [&]() { AESCryptoJavaClass<T>::generateKey(buffer); });
}

template <typename T>
void AESCrypto<T>::encrypt(T key, T plaintext, T sealedData) {
  NativeAndroidAccessProvider::runTask(
      [&]() { AESCryptoJavaClass<T>::encrypt(key, plaintext, sealedData); });
}

template <typename T>
void AESCrypto<T>::decrypt(T key, T sealedData, T plaintext) {
  NativeAndroidAccessProvider::runTask(
      [&]() { AESCryptoJavaClass<T>::decrypt(key, sealedData, plaintext); });
}

template class AESCrypto<rust::Slice<uint8_t>>;
template class AESCrypto<std::vector<std::uint8_t> &>;

} // namespace comm
