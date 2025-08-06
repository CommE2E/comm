#include "ServicesUtils.h"
#include "StaffUtils.h"

namespace comm {
bool ServicesUtils::fullBackupSupport() {
#if DEBUG
  return true;
#else
  return StaffUtils::isStaffRelease();
#endif
}
} // namespace comm
