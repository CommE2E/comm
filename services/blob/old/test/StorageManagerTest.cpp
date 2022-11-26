#include <gtest/gtest.h>

#include "Constants.h"
#include "S3Tools.h"
#include "TestTools.h"

#include <aws/core/Aws.h>

#include <chrono>
#include <memory>
#include <string>

using namespace comm::network;

class StorageManagerTest : public testing::Test {
public:
protected:
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
  EXPECT_TRUE(getBucket(BLOB_BUCKET_NAME).isAvailable());
  std::string objectName = createObject(getBucket(BLOB_BUCKET_NAME));

  getBucket(BLOB_BUCKET_NAME).writeObject(objectName, data);

  EXPECT_EQ(getBucket(BLOB_BUCKET_NAME).getObjectSize(objectName), data.size());
  EXPECT_TRUE(getBucket(BLOB_BUCKET_NAME).getObjectData(objectName) == data);
  std::string chunkedData;
  const size_t chunkSize = data.size() / 10;
  std::function<void(const std::string &)> callback =
      [&chunkedData](const std::string &chunk) { chunkedData += chunk; };
  getBucket(BLOB_BUCKET_NAME)
      .getObjectDataChunks(objectName, callback, chunkSize);
  EXPECT_TRUE(data == chunkedData);

  getBucket(BLOB_BUCKET_NAME).renameObject(objectName, objectName + "c");
  EXPECT_THROW(
      getBucket(BLOB_BUCKET_NAME).getObjectData(objectName),
      std::runtime_error);
  EXPECT_TRUE(
      getBucket(BLOB_BUCKET_NAME).getObjectData(objectName + "c") == data);
  getBucket(BLOB_BUCKET_NAME).renameObject(objectName + "c", objectName);

  getBucket(BLOB_BUCKET_NAME).clearObject(objectName);
  EXPECT_EQ(getBucket(BLOB_BUCKET_NAME).getObjectSize(objectName), 0);

  getBucket(BLOB_BUCKET_NAME).removeObject(objectName);
  EXPECT_THROW(
      getBucket(BLOB_BUCKET_NAME).getObjectData(objectName),
      std::runtime_error);
}
