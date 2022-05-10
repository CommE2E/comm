#include <gtest/gtest.h>

#include "S3Tools.h"
#include "TestTools.h"

#include <aws/core/Aws.h>

#include <chrono>
#include <iostream>
#include <memory>
#include <string>

using namespace comm::network;

class StorageManagerTest : public testing::Test {
public:
protected:
  const std::string bucketName = "commapp-test";
  const std::string data =
      "yiU3VaZlKfTteO10yrWmK1Q5BOvBQrdmj2aBlnoLuhxLfRZK1n8"
      "26FRXJAGhPswR1r8yxtwxyLkv3I4J4tlH4brDP10mrB99XpM6";

  virtual void SetUp() {
    Aws::InitAPI({});
  }

  virtual void TearDown() {
    Aws::ShutdownAPI({});
  }
};

TEST_F(StorageManagerTest, ObjectOperationsTest) {
  EXPECT_TRUE(getBucket(bucketName).isAvailable());
  std::string objectName = createObject(getBucket(bucketName));

  getBucket(bucketName).writeObject(objectName, data);

  EXPECT_EQ(getBucket(bucketName).getObjectSize(objectName), data.size());
  EXPECT_TRUE(getBucket(bucketName).getObjectData(objectName) == data);
  std::string chunkedData;
  const size_t chunkSize = data.size() / 10;
  std::function<void(const std::string &)> callback =
      [&chunkedData](const std::string &chunk) { chunkedData += chunk; };
  getBucket(bucketName).getObjectDataChunks(objectName, callback, chunkSize);
  EXPECT_TRUE(data == chunkedData);

  getBucket(bucketName).renameObject(objectName, objectName + "c");
  EXPECT_THROW(
      getBucket(bucketName).getObjectData(objectName), std::runtime_error);
  EXPECT_TRUE(getBucket(bucketName).getObjectData(objectName + "c") == data);
  getBucket(bucketName).renameObject(objectName + "c", objectName);

  getBucket(bucketName).clearObject(objectName);
  EXPECT_EQ(getBucket(bucketName).getObjectSize(objectName), 0);

  getBucket(bucketName).removeObject(objectName);
  EXPECT_THROW(
      getBucket(bucketName).getObjectData(objectName), std::runtime_error);
}
