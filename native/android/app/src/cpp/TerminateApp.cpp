#include <Tools/TerminateApp.h>
#include <fbjni/fbjni.h>

using namespace facebook::jni;

class TerminateAppJavaClass : public JavaClass<TerminateAppJavaClass> {
public:
  static auto constexpr kJavaDescriptor =
      "Lapp/comm/android/fbjni/TerminateApp;";

  static void terminate() {
    static const auto cls = javaClassStatic();
    static auto method = cls->getStaticMethod<void()>("terminate");
    method(cls);
  }
};

namespace comm {

void TerminateApp::terminate() {
  TerminateAppJavaClass::terminate();
}

} // namespace comm
