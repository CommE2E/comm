#include <Internal/GlobalNetworkSingleton.h>
#include <Internal/GlobalNetworkSingletonJNIHelper.h>

namespace comm {
void GlobalNetworkSingletonJNIHelper::sendPong(
    facebook::jni::alias_ref<GlobalNetworkSingletonJNIHelper> jThis) {
  GlobalNetworkSingleton::instance.scheduleOrRun(
      [](NetworkModule &networkModule) { networkModule.sendPong(); });
}

void GlobalNetworkSingletonJNIHelper::registerNatives() {
  javaClassStatic()->registerNatives({
      makeNativeMethod("sendPong", GlobalNetworkSingletonJNIHelper::sendPong),
  });
}

} // namespace comm
