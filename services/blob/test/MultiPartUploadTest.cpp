#include <gtest/gtest.h>

#include "AwsS3Bucket.h"
#include "Constants.h"
#include "MultiPartUploader.h"
#include "S3Tools.h"
#include "TestTools.h"
#include "Tools.h"

#include <aws/core/Aws.h>
#include <aws/s3/S3Client.h>

#include <string>

using namespace comm::network;

class MultiPartUploadTest : public testing::Test {
protected:
  std::shared_ptr<Aws::S3::S3Client> s3Client;
  std::unique_ptr<AwsS3Bucket> bucket;

  virtual void SetUp() {
    Aws::InitAPI({});
    s3Client = std::move(getS3Client());
    bucket = std::make_unique<AwsS3Bucket>(BLOB_BUCKET_NAME);
  }

  virtual void TearDown() {
    Aws::ShutdownAPI({});
  }
};

std::string generateNByes(const size_t n) {
  std::string result;
  result.resize(n);
  memset((char *)result.data(), 'A', n);
  return result;
}

TEST_F(MultiPartUploadTest, ThrowingTooSmallPart) {
  std::string objectName = createObject(*bucket);
  MultiPartUploader mpu(s3Client, BLOB_BUCKET_NAME, objectName);
  mpu.addPart("xxx");
  mpu.addPart("xxx");
  EXPECT_THROW(mpu.finishUpload(), std::runtime_error);
}

TEST_F(MultiPartUploadTest, ThrowingTooSmallPartOneByte) {
  std::string objectName = createObject(*bucket);
  MultiPartUploader mpu(s3Client, BLOB_BUCKET_NAME, objectName);
  mpu.addPart(generateNByes(AWS_MULTIPART_UPLOAD_MINIMUM_CHUNK_SIZE - 1));
  mpu.addPart("xxx");
  EXPECT_THROW(mpu.finishUpload(), std::runtime_error);
}

TEST_F(MultiPartUploadTest, SuccessfulWriteMultipleChunks) {
  std::string objectName = createObject(*bucket);
  MultiPartUploader mpu(s3Client, BLOB_BUCKET_NAME, objectName);
  mpu.addPart(generateNByes(AWS_MULTIPART_UPLOAD_MINIMUM_CHUNK_SIZE));
  mpu.addPart("xxx");
  mpu.finishUpload();
  EXPECT_THROW(
      bucket->getObjectData(objectName), tools::invalid_argument_error);
  EXPECT_EQ(
      bucket->getObjectSize(objectName),
      AWS_MULTIPART_UPLOAD_MINIMUM_CHUNK_SIZE + 3);
  bucket->removeObject(objectName);
}

TEST_F(MultiPartUploadTest, SuccessfulWriteOneChunk) {
  std::string objectName = createObject(*bucket);
  MultiPartUploader mpu(s3Client, BLOB_BUCKET_NAME, objectName);
  mpu.addPart("xxx");
  mpu.finishUpload();
  EXPECT_EQ(bucket->getObjectSize(objectName), 3);
  bucket->removeObject(objectName);
}
