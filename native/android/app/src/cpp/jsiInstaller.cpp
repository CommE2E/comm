#include "jniHelpers.h"
#include <CallInvokerHolder.h>
#include <fbjni/fbjni.h>
#include <jsi/jsi.h>

#include <DatabaseManagers/SQLiteQueryExecutor.h>
#include <InternalModules/DatabaseInitializerJNIHelper.h>
#include <InternalModules/GlobalDBSingletonJNIHelper.h>
#include <NativeModules/CommConstants.h>
#include <NativeModules/CommCoreModule.h>
#include <NativeModules/CommRustModule.h>
#include <NativeModules/CommUtilsModule.h>
#include <Notifications/BackgroundDataStorage/NotificationsCryptoModuleJNIHelper.h>
#include <PersistentStorageUtilities/MessageOperationsUtilities/MessageOperationsUtilitiesJNIHelper.h>
#include <PersistentStorageUtilities/ThreadOperationsUtilities/ThreadOperationsJNIHelper.h>
#include <Tools/StaffUtilsJNIHelper.h>

namespace jni = facebook::jni;
namespace jsi = facebook::jsi;
namespace react = facebook::react;

class CommHybrid : public jni::HybridClass<CommHybrid> {
public:
  static auto constexpr kJavaDescriptor = "Lapp/comm/android/fbjni/CommHybrid;";

  static void initHybrid(
      jni::alias_ref<jhybridobject> jThis,
      jlong jsContext,
      jni::alias_ref<react::CallInvokerHolder::javaobject> jsCallInvokerHolder,
      comm::HashMap additionalParameters) {
    jsi::Runtime *rt = (jsi::Runtime *)jsContext;
    auto jsCallInvoker = jsCallInvokerHolder->cthis()->getCallInvoker();
    std::shared_ptr<comm::CommCoreModule> coreNativeModule =
        std::make_shared<comm::CommCoreModule>(jsCallInvoker);
    std::shared_ptr<comm::CommUtilsModule> utilsNativeModule =
        std::make_shared<comm::CommUtilsModule>(jsCallInvoker);
    std::shared_ptr<comm::CommRustModule> rustNativeModule =
        std::make_shared<comm::CommRustModule>(jsCallInvoker);
    std::shared_ptr<comm::CommConstants> nativeConstants =
        std::make_shared<comm::CommConstants>();

    if (rt != nullptr) {
      rt->global().setProperty(
          *rt,
          jsi::PropNameID::forAscii(*rt, "CommCoreModule"),
          jsi::Object::createFromHostObject(*rt, coreNativeModule));
      rt->global().setProperty(
          *rt,
          jsi::PropNameID::forAscii(*rt, "CommUtilsModule"),
          jsi::Object::createFromHostObject(*rt, utilsNativeModule));
      rt->global().setProperty(
          *rt,
          jsi::PropNameID::forAscii(*rt, "CommRustModule"),
          jsi::Object::createFromHostObject(*rt, rustNativeModule));
      rt->global().setProperty(
          *rt,
          jsi::PropNameID::forAscii(*rt, "CommConstants"),
          jsi::Object::createFromHostObject(*rt, nativeConstants));
    }

    jni::local_ref<jni::JObject> sqliteFilePathObj =
        additionalParameters.get("sqliteFilePath");
    std::string sqliteFilePath = sqliteFilePathObj->toString();

    comm::SQLiteQueryExecutor::initialize(sqliteFilePath);
  }

  static void registerNatives() {
    javaClassStatic()->registerNatives({
        makeNativeMethod("initHybrid", CommHybrid::initHybrid),
    });
  }

private:
  friend HybridBase;
};

JNIEXPORT jint JNI_OnLoad(JavaVM *vm, void *) {
  return jni::initialize(vm, [] {
    CommHybrid::registerNatives();
    comm::ThreadOperationsJNIHelper::registerNatives();
    comm::MessageOperationsUtilitiesJNIHelper::registerNatives();
    comm::GlobalDBSingletonJNIHelper::registerNatives();
    comm::DatabaseInitializerJNIHelper::registerNatives();
    comm::NotificationsCryptoModuleJNIHelper::registerNatives();
    comm::StaffUtilsJNIHelper::registerNatives();
  });
}
