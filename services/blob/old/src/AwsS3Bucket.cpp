#include "AwsS3Bucket.h"
#include "Constants.h"
#include "GlobalConstants.h"
#include "MultiPartUploader.h"
#include "S3Tools.h"
#include "Tools.h"

#include <aws/s3/model/CopyObjectRequest.h>
#include <aws/s3/model/DeleteObjectRequest.h>
#include <aws/s3/model/GetObjectRequest.h>
#include <aws/s3/model/HeadBucketRequest.h>
#include <aws/s3/model/HeadObjectRequest.h>
#include <aws/s3/model/ListObjectsRequest.h>
#include <aws/s3/model/Object.h>
#include <aws/s3/model/PutObjectRequest.h>

#include <boost/interprocess/streams/bufferstream.hpp>

namespace comm {
namespace network {

AwsS3Bucket::AwsS3Bucket(const std::string name) : name(name) {
}

std::vector<std::string> AwsS3Bucket::listObjects() const {
  Aws::S3::Model::ListObjectsRequest request;
  request.SetBucket(this->name);
  std::vector<std::string> result;

  Aws::S3::Model::ListObjectsOutcome outcome =
      getS3Client()->ListObjects(request);
  if (!outcome.IsSuccess()) {
    throw std::runtime_error(outcome.GetError().GetMessage());
  }
  Aws::Vector<Aws::S3::Model::Object> objects =
      outcome.GetResult().GetContents();
  for (Aws::S3::Model::Object &object : objects) {
    result.push_back(object.GetKey());
  }
  return result;
}

bool AwsS3Bucket::isAvailable() const {
  Aws::S3::Model::HeadBucketRequest headRequest;
  headRequest.SetBucket(this->name);
  Aws::S3::Model::HeadBucketOutcome outcome =
      getS3Client()->HeadBucket(headRequest);
  return outcome.IsSuccess();
}

size_t AwsS3Bucket::getObjectSize(const std::string &objectName) const {
  Aws::S3::Model::HeadObjectRequest headRequest;
  headRequest.SetBucket(this->name);
  headRequest.SetKey(objectName);
  Aws::S3::Model::HeadObjectOutcome headOutcome =
      getS3Client()->HeadObject(headRequest);
  if (!headOutcome.IsSuccess()) {
    throw std::runtime_error(headOutcome.GetError().GetMessage());
  }
  return headOutcome.GetResultWithOwnership().GetContentLength();
}

void AwsS3Bucket::renameObject(
    const std::string &currentName,
    const std::string &newName) {
  Aws::S3::Model::CopyObjectRequest copyRequest;
  copyRequest.SetCopySource(this->name + "/" + currentName);
  copyRequest.SetKey(newName);
  copyRequest.SetBucket(this->name);

  Aws::S3::Model::CopyObjectOutcome copyOutcome =
      getS3Client()->CopyObject(copyRequest);
  if (!copyOutcome.IsSuccess()) {
    throw std::runtime_error(copyOutcome.GetError().GetMessage());
  }

  this->removeObject(currentName);
}

void AwsS3Bucket::writeObject(
    const std::string &objectName,
    const std::string &data) {
  // we don't have to handle multiple write here because the GRPC limit is 4MB
  // and minimum size of data to perform multipart upload is 5MB
  Aws::S3::Model::PutObjectRequest request;
  request.SetBucket(this->name);
  request.SetKey(objectName);

  std::shared_ptr<Aws::IOStream> body = std::shared_ptr<Aws::IOStream>(
      new boost::interprocess::bufferstream((char *)data.data(), data.size()));

  request.SetBody(body);

  Aws::S3::Model::PutObjectOutcome outcome = getS3Client()->PutObject(request);

  if (!outcome.IsSuccess()) {
    throw std::runtime_error(outcome.GetError().GetMessage());
  }
}

std::string AwsS3Bucket::getObjectData(const std::string &objectName) const {
  Aws::S3::Model::GetObjectRequest request;
  request.SetBucket(this->name);
  request.SetKey(objectName);

  const size_t size = this->getObjectSize(objectName);
  if (size > GRPC_CHUNK_SIZE_LIMIT) {
    throw tools::invalid_argument_error(std::string(
        "The file is too big(" + std::to_string(size) + " bytes, max is " +
        std::to_string(GRPC_CHUNK_SIZE_LIMIT) +
        "bytes), please, use getObjectDataChunks"));
  }
  Aws::S3::Model::GetObjectOutcome outcome = getS3Client()->GetObject(request);

  if (!outcome.IsSuccess()) {
    throw std::runtime_error(outcome.GetError().GetMessage());
  }

  Aws::IOStream &retrievedFile = outcome.GetResultWithOwnership().GetBody();

  std::stringstream buffer;
  buffer << retrievedFile.rdbuf();
  std::string result(buffer.str());
  std::string cpy = result;

  return result;
}

void AwsS3Bucket::getObjectDataChunks(
    const std::string &objectName,
    const std::function<void(const std::string &)> &callback,
    const size_t chunkSize) const {
  const size_t fileSize = this->getObjectSize(objectName);

  if (fileSize == 0) {
    return;
  }

  Aws::S3::Model::GetObjectRequest request;
  request.SetBucket(this->name);
  request.SetKey(objectName);
  for (size_t offset = 0; offset < fileSize; offset += chunkSize) {
    const size_t nextSize = std::min(chunkSize, fileSize - offset);

    std::string range = "bytes=" + std::to_string(offset) + "-" +
        std::to_string(offset + nextSize);
    request.SetRange(range);

    Aws::S3::Model::GetObjectOutcome getOutcome =
        getS3Client()->GetObject(request);
    if (!getOutcome.IsSuccess()) {
      throw std::runtime_error(getOutcome.GetError().GetMessage());
    }

    Aws::IOStream &retrievedFile =
        getOutcome.GetResultWithOwnership().GetBody();

    std::stringstream buffer;
    buffer << retrievedFile.rdbuf();
    std::string result(buffer.str());
    result.resize(nextSize);
    callback(result);
  }
}

void AwsS3Bucket::appendToObject(
    const std::string &objectName,
    const std::string &data) {
  const size_t objectSize = this->getObjectSize(objectName);
  if (objectSize < AWS_MULTIPART_UPLOAD_MINIMUM_CHUNK_SIZE) {
    std::string currentData = this->getObjectData(objectName);
    currentData += data;
    this->writeObject(objectName, currentData);
    return;
  }
  size_t currentSize = 0;
  MultiPartUploader uploader(
      getS3Client(), this->name, objectName + "-multipart");
  std::function<void(const std::string &)> callback =
      [&uploader, &data, &currentSize, objectSize](const std::string &chunk) {
        currentSize += chunk.size();
        if (currentSize < objectSize) {
          uploader.addPart(chunk);
        } else if (currentSize == objectSize) {
          uploader.addPart(std::string(chunk + data));
        } else {
          throw std::runtime_error(
              "size of chunks exceeds the size of the object");
        }
      };
  this->getObjectDataChunks(
      objectName, callback, AWS_MULTIPART_UPLOAD_MINIMUM_CHUNK_SIZE);
  uploader.finishUpload();
  // this will overwrite the target file
  this->renameObject(objectName + "-multipart", objectName);
  const size_t newSize = this->getObjectSize(objectName);
  if (objectSize + data.size() != newSize) {
    throw std::runtime_error(
        "append to object " + objectName +
        " has been performed but the final sizes don't "
        "match, the size is now [" +
        std::to_string(newSize) + "] but should be [" +
        std::to_string(objectSize + data.size()) + "]");
  }
}

void AwsS3Bucket::clearObject(const std::string &objectName) {
  this->writeObject(objectName, "");
}

void AwsS3Bucket::removeObject(const std::string &objectName) {
  Aws::S3::Model::DeleteObjectRequest deleteRequest;
  deleteRequest.SetBucket(this->name);
  deleteRequest.SetKey(objectName);

  Aws::S3::Model::DeleteObjectOutcome deleteOutcome =
      getS3Client()->DeleteObject(deleteRequest);
  if (!deleteOutcome.IsSuccess()) {
    throw std::runtime_error(deleteOutcome.GetError().GetMessage());
  }
}

} // namespace network
} // namespace comm
