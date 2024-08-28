#include <Tools/CommMMKV.h>
#include <Tools/CommMMKVJNIHelper.h>

namespace comm {
std::string CommMMKVJNIHelper::notifsStorageUnreadThickThreadsKey(
    facebook::jni::alias_ref<CommMMKVJNIHelper> jThis) {
  return CommMMKV::notifsStorageUnreadThickThreadsKey;
}

void CommMMKVJNIHelper::registerNatives() {
  javaClassStatic()->registerNatives({makeNativeMethod(
      "notifsStorageUnreadThickThreadsKey",
      CommMMKVJNIHelper::notifsStorageUnreadThickThreadsKey)});
}
} // namespace comm
