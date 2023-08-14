#include <Tools/StaffUtils.h>
#include <Tools/StaffUtilsJNIHelper.h>

namespace comm {
bool StaffUtilsJNIHelper::isStaffRelease(
    facebook::jni::alias_ref<StaffUtilsJNIHelper> jThis) {
  return StaffUtils::isStaffRelease();
}

void StaffUtilsJNIHelper::registerNatives() {
  javaClassStatic()->registerNatives({makeNativeMethod(
      "isStaffRelease", StaffUtilsJNIHelper::isStaffRelease)});
}
} // namespace comm
