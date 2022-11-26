#include "TestTools.h"
#include "AwsS3Bucket.h"

namespace comm {
namespace network {

std::string generateObjectName() {
  std::chrono::milliseconds ms =
      std::chrono::duration_cast<std::chrono::milliseconds>(
          std::chrono::system_clock::now().time_since_epoch());
  return std::to_string(ms.count());
}

std::string createObject(AwsS3Bucket bucket) {
  std::string objectName;
  std::vector<std::string> presentObjects;
  do {
    objectName = generateObjectName();
    presentObjects = bucket.listObjects();
  } while (
      std::find(presentObjects.begin(), presentObjects.end(), objectName) !=
      presentObjects.end());
  return objectName;
}

} // namespace network
} // namespace comm
