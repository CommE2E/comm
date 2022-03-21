#pragma once

#include <aws/core/Aws.h>
#include <aws/s3/S3Client.h>

#include <functional>
#include <string>
#include <vector>

namespace comm {
namespace network {

class AwsS3Bucket {
  const std::string name;

public:
  AwsS3Bucket(const std::string name);

  std::vector<std::string> listObjects() const;
  bool isAvailable() const;
  size_t getObjectSize(const std::string &objectName) const;
  void renameObject(const std::string &currentName, const std::string &newName);
  void writeObject(const std::string &objectName, const std::string &data);
  std::string getObjectData(const std::string &objectName) const;
  void getObjectDataChunks(
      const std::string &objectName,
      const std::function<void(const std::string &)> &callback,
      const size_t chunkSize) const;
  void appendToObject(const std::string &objectName, const std::string &data);
  void clearObject(const std::string &objectName);
  void removeObject(const std::string &objectName);
};

} // namespace network
} // namespace comm
