#include "jniHelpers.h"
#include <Tools/Logger.h>
#include <Tools/PlatformSpecificTools.h>
#include <fbjni/fbjni.h>

using namespace facebook::jni;

class PlatformSpecificToolsJavaClass
    : public JavaClass<PlatformSpecificToolsJavaClass> {
public:
  static auto constexpr kJavaDescriptor =
      "Lapp/comm/android/fbjni/PlatformSpecificTools;";

  static comm::crypto::OlmBuffer generateSecureRandomBytes(size_t size) {
    static const auto cls = javaClassStatic();
    static auto method =
        cls->getStaticMethod<JArrayByte(int)>("generateSecureRandomBytes");
    auto methodResult = method(cls, (int)size);
    comm::crypto::OlmBuffer result(size);
    std::vector<jbyte> bytes(size);
    methodResult->getRegion(0, size, bytes.data());
    for (size_t i = 0; i < size; ++i) {
      result[i] = bytes[i];
    }
    return result;
  }

  static std::string getNotificationsCryptoAccountPath() {
    static const auto cls = javaClassStatic();
    static auto method =
        cls->getStaticMethod<JString()>("getNotificationsCryptoAccountPath");
    return method(cls)->toStdString();
  }

  static std::string
  getBackupFilePath(std::string backupID, bool isAttachments) {
    static const auto cls = javaClassStatic();
    static auto method =
        cls->getStaticMethod<JString(std::string, bool)>("getBackupFilePath");
    return method(cls, backupID, isAttachments)->toStdString();
  }

  static void removeBackupDirectory() {
    static const auto cls = javaClassStatic();
    static auto method = cls->getStaticMethod<void()>("removeBackupDirectory");
    method(cls);
  }
};

namespace comm {

void PlatformSpecificTools::generateSecureRandomBytes(
    crypto::OlmBuffer &buffer,
    size_t size) {
  NativeAndroidAccessProvider::runTask([&buffer, size]() {
    buffer = PlatformSpecificToolsJavaClass::generateSecureRandomBytes(size);
  });
}

std::string PlatformSpecificTools::getDeviceOS() {
  return std::string{"android"};
}

std::string PlatformSpecificTools::getNotificationsCryptoAccountPath() {
  std::string path;
  NativeAndroidAccessProvider::runTask([&path]() {
    path = PlatformSpecificToolsJavaClass::getNotificationsCryptoAccountPath();
  });
  return path;
}

std::string PlatformSpecificTools::getBackupFilePath(
    std::string backupID,
    bool isAttachments) {
  std::string path;
  NativeAndroidAccessProvider::runTask([&path, backupID, isAttachments]() {
    path = PlatformSpecificToolsJavaClass::getBackupFilePath(
        backupID, isAttachments);
  });
  return path;
}

void PlatformSpecificTools::removeBackupDirectory() {
  NativeAndroidAccessProvider::runTask(
      []() { PlatformSpecificToolsJavaClass::removeBackupDirectory(); });
}

} // namespace comm
