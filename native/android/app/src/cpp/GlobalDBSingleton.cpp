#include <InternalModules/GlobalDBSingleton.h>
#include <InternalModules/GlobalDBSingletonJNIHelper.h>

namespace comm {
GlobalDBSingleton GlobalDBSingleton::instance;

GlobalDBSingleton::GlobalDBSingleton()
    : multithreadingEnabled(true),
      databaseThread(std::make_unique<WorkerThread>("database")),
      tasksCancelled(false) {
}

void GlobalDBSingleton::scheduleOrRun(const taskType task) {
  this->scheduleOrRunCommonImpl(task);
}

void GlobalDBSingleton::scheduleOrRunCancellable(const taskType task) {
  this->scheduleOrRunCancellableCommonImpl(task);
}

void GlobalDBSingleton::scheduleOrRunCancellable(
    const taskType task,
    const std::shared_ptr<facebook::react::Promise> promise,
    const std::shared_ptr<facebook::react::CallInvoker> jsInvoker) {
  this->scheduleOrRunCancellableCommonImpl(task, promise, jsInvoker);
}

void GlobalDBSingleton::enableMultithreading() {
  this->enableMultithreadingCommonImpl();
}

void GlobalDBSingletonJNIHelper::scheduleOrRun(
    facebook::jni::alias_ref<GlobalDBSingletonJNIHelper> jThis,
    facebook::jni::alias_ref<Runnable> task) {
  auto globalTaskRef = facebook::jni::make_global(task);
  GlobalDBSingleton::instance.scheduleOrRun(
      [globalTaskRef = std::move(globalTaskRef)]() mutable {
        auto runTask = [globalTaskRef = std::move(globalTaskRef)]() mutable {
          globalTaskRef->run();
          globalTaskRef.release();
        };
        facebook::jni::ThreadScope::WithClassLoader(std::move(runTask));
      });
}

void GlobalDBSingletonJNIHelper::enableMultithreading(
    facebook::jni::alias_ref<GlobalDBSingletonJNIHelper> jThis) {
  GlobalDBSingleton::instance.enableMultithreading();
}

void GlobalDBSingletonJNIHelper::registerNatives() {
  javaClassStatic()->registerNatives({
      makeNativeMethod(
          "scheduleOrRun", GlobalDBSingletonJNIHelper::scheduleOrRun),
      makeNativeMethod(
          "enableMultithreading",
          GlobalDBSingletonJNIHelper::enableMultithreading),
  });
}
} // namespace comm
