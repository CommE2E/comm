#include <InternalModules/RustNetworkingSingleton.h>
#include <InternalModules/RustNetworkingSingletonJNIHelper.h>

namespace comm {
RustNetworkingSingleton RustNetworkingSingleton::instance;

RustNetworkingSingleton::RustNetworkingSingleton()
    : multithreadingEnabled(true),
      rustNetworkingThread(std::make_unique<WorkerThread>("rust-networking")) {
}

void RustNetworkingSingleton::schedule(const taskType task) {
  this->scheduleCommonImpl(task);
}

void RustNetworkingSingleton::enableMultithreading() {
  this->enableMultithreadingCommonImpl();
}

uint32_t RustNetworkingSingleton::addPromise(
    std::shared_ptr<Promise> promise,
    std::shared_ptr<facebook::react::CallInvoker> jsInvoker) {
  return addPromiseCommonImpl(promise, jsInvoker);
}

void RustNetworkingSingleton::removePromise(uint32_t id) {
  removePromiseCommonImpl(id);
}

void RustNetworkingSingleton::resolvePromise(uint32_t id, double ret) {
  resolvePromiseCommonImpl(id, ret);
}

void RustNetworkingSingleton::rejectPromise(
    uint32_t id,
    const std::string &error) {
  rejectPromiseCommonImpl(id, error);
}

void RustNetworkingSingletonJNIHelper::schedule(
    facebook::jni::alias_ref<RustNetworkingSingletonJNIHelper> jThis,
    facebook::jni::alias_ref<Runnable> task) {
  auto globalTaskRef = facebook::jni::make_global(task);
  RustNetworkingSingleton::instance.schedule(
      [globalTaskRef = std::move(globalTaskRef)]() mutable {
        auto runTask = [globalTaskRef = std::move(globalTaskRef)]() mutable {
          globalTaskRef->run();
          globalTaskRef.release();
        };
        facebook::jni::ThreadScope::WithClassLoader(std::move(runTask));
      });
}

void RustNetworkingSingletonJNIHelper::enableMultithreading(
    facebook::jni::alias_ref<RustNetworkingSingletonJNIHelper> jThis) {
  RustNetworkingSingleton::instance.enableMultithreading();
}

void RustNetworkingSingletonJNIHelper::registerNatives() {
  javaClassStatic()->registerNatives({
      makeNativeMethod("schedule", RustNetworkingSingletonJNIHelper::schedule),
      makeNativeMethod(
          "enableMultithreading",
          RustNetworkingSingletonJNIHelper::enableMultithreading),
  });
}
} // namespace comm
