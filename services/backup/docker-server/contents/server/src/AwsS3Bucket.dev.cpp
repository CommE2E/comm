#include "AwsS3Bucket.h"
#include "DevTools.h"
#include "Tools.h"

#include <filesystem>
#include <fstream>
#include <iostream>

namespace comm {
namespace network {

AwsS3Bucket::AwsS3Bucket(
    const std::string name,
    std::shared_ptr<Aws::S3::S3Client> client)
    : name(name), client(nullptr) {
  std::filesystem::create_directories(commFilesystemPath);
}

std::vector<std::string> AwsS3Bucket::listObjects() {
  std::vector<std::string> result;
  for (const auto &entry :
       std::filesystem::directory_iterator(commFilesystemPath)) {
    result.push_back(entry.path());
  }
  return result;
}

bool AwsS3Bucket::isAvailable() const {
  return std::filesystem::exists(commFilesystemPath);
}

const size_t AwsS3Bucket::getObjectSize(const std::string &objectName) {
  return std::filesystem::file_size(createCommPath(objectName));
}

void AwsS3Bucket::renameObject(
    const std::string &currentName,
    const std::string &newName) {
  std::filesystem::rename(createCommPath(currentName), createCommPath(newName));
}

void AwsS3Bucket::writeObject(
    const std::string &objectName,
    const std::string data) {
  if (std::filesystem::exists(createCommPath(objectName))) {
    this->clearObject(createCommPath(objectName));
  }
  std::ofstream ofs(createCommPath(objectName));
  ofs << data;
}

std::string AwsS3Bucket::getObjectData(const std::string &objectName) {
  std::ifstream ifs(
      createCommPath(objectName),
      std::ios::in | std::ios::binary | std::ios::ate);

  std::ifstream::pos_type fileSize = ifs.tellg();
  ifs.seekg(0, std::ios::beg);
  if (fileSize > GRPC_CHUNK_SIZE_LIMIT) {
    throw invalid_argument_error(std::string(
        "The file is too big(" + std::to_string(fileSize) + " bytes, max is " +
        std::to_string(GRPC_CHUNK_SIZE_LIMIT) +
        "bytes), please, use getObjectDataChunks"));
  }

  std::string bytes;
  bytes.resize(fileSize);
  ifs.read((char *)bytes.data(), fileSize);

  return bytes;
}

void AwsS3Bucket::getObjectDataChunks(
    const std::string &objectName,
    const std::function<void(const std::string &)> &callback,
    const size_t chunkSize) {
  std::ifstream ifs(
      createCommPath(objectName),
      std::ios::in | std::ios::binary | std::ios::ate);

  std::ifstream::pos_type fileSize = ifs.tellg();

  size_t filePos = 0;
  while (filePos < fileSize) {
    ifs.seekg(filePos, std::ios::beg);
    std::string bytes;
    bytes.resize(chunkSize);
    ifs.read((char *)bytes.data(), chunkSize);
    filePos += bytes.size();
    callback(bytes);
  }
}

void AwsS3Bucket::appendToObject(
    const std::string &objectName,
    const std::string data) {
  std::ofstream ofs;
  ofs.open(createCommPath(objectName), std::ios_base::app);
  ofs << data;
}

void AwsS3Bucket::clearObject(const std::string &objectName) {
  std::filesystem::resize_file(createCommPath(objectName), 0);
}

void AwsS3Bucket::deleteObject(const std::string &objectName) {
  std::filesystem::remove(createCommPath(objectName));
}

} // namespace network
} // namespace comm
