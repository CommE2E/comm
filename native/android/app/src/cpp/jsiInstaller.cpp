#include <jsi/jsi.h>
#include <fbjni/fbjni.h>
#include <CallInvokerHolder.h>
#include "DraftNativeModule.h"

namespace jni = facebook::jni;
namespace jsi = facebook::jsi;
namespace react = facebook::react;

class CommHybrid : public jni::HybridClass<CommHybrid>
{
public:
  static auto constexpr kJavaDescriptor =
    "Lorg/squadcal/fbjni/CommHybrid;";

  static void initHybrid(
    jni::alias_ref<jhybridobject> jThis,
    jlong jsContext,
    jni::alias_ref<react::CallInvokerHolder::javaobject> jsCallInvokerHolder
  ) {
    jsi::Runtime *runtime = (jsi::Runtime *)jsContext;
    auto jsCallInvoker = jsCallInvokerHolder->cthis()->getCallInvoker();
    std::shared_ptr<comm::DraftNativeModule> nativeModule =
      std::make_shared<comm::DraftNativeModule>(jsCallInvoker);


    runtime->global().setProperty(
      *runtime,
      jsi::PropNameID::forAscii(*runtime, "draftModule"),
      jsi::Object::createFromHostObject(*runtime, nativeModule)
    );
  }

  static void registerNatives() {
    javaClassStatic()->registerNatives({
      makeNativeMethod("initHybrid", CommHybrid::initHybrid),
    });
  }

private:
  friend HybridBase;
};

JNIEXPORT jint JNI_OnLoad(JavaVM* vm, void*) {
  return jni::initialize(vm, [] {
    CommHybrid::registerNatives();
  });
}
