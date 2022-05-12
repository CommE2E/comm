#include "AwsTools.h"
#include "Constants.h"

namespace comm {
namespace network {

Aws::String getAwsRegion() {
  auto profileName = Aws::Auth::GetConfigProfileName();
  if (Aws::Config::HasCachedConfigProfile(profileName)) {
    auto profile = Aws::Config::GetCachedConfigProfile(profileName);
    Aws::String profileRegion = profile.GetRegion();
    if (!profileRegion.empty()) {
      return profileRegion;
    }
  }
  return {};
}

} // namespace network
} // namespace comm
