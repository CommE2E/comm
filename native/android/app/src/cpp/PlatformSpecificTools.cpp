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
};

namespace comm {

void PlatformSpecificTools::generateSecureRandomBytes(
    crypto::OlmBuffer &buffer,
    size_t size) {
  buffer = PlatformSpecificToolsJavaClass::generateSecureRandomBytes(size);
}

std::string PlatformSpecificTools::getDeviceOS() {
  return std::string{"android"};
}

} // namespace comm
