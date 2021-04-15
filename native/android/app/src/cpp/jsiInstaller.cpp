#include <jsi/jsi.h>
#include <fbjni/fbjni.h>
#include <CallInvokerHolder.h>
#include "DraftNativeModule.h"
#include "SQLiteManager.h"
#include "jniHelpers.h"

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
    jni::alias_ref<react::CallInvokerHolder::javaobject> jsCallInvokerHolder,
    comm::HashMap additionalParameters
  ) {
    jsi::Runtime *rt = (jsi::Runtime *)jsContext;
    auto jsCallInvoker = jsCallInvokerHolder->cthis()->getCallInvoker();
    std::shared_ptr<comm::DraftNativeModule> nativeModule =
      std::make_shared<comm::DraftNativeModule>(jsCallInvoker);

    // patch runtime
    // - add draft module
    rt->global().setProperty(
      *rt,
      jsi::PropNameID::forAscii(*rt, "draftModule"),
      jsi::Object::createFromHostObject(*rt, nativeModule)
    );

    // set sqlite file path
    jni::local_ref<jni::JObject> sqliteFilePathObj = 
      additionalParameters.get("sqliteFilePath");
    comm::SQLiteManager::sqliteFilePath = sqliteFilePathObj->toString();
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
