#pragma once

#include "Item.h"
#include "S3Path.h"

#include <string>

namespace comm {
namespace network {
namespace database {

class BlobItem : public Item {

  std::string blobHash;
  S3Path s3Path;
  uint64_t created = 0;

  void validate() const override;

public:
  static const std::string TABLE_NAME;
  static const std::string FIELD_BLOB_HASH;
  static const std::string FIELD_S3_PATH;
  static const std::string FIELD_CREATED;

  BlobItem() {
  }
  BlobItem(
      const std::string blobHash,
      const S3Path s3Path,
      uint64_t created = 0);
  BlobItem(const AttributeValues &itemFromDB);

  void assignItemFromDatabase(const AttributeValues &itemFromDB) override;

  std::string getTableName() const override;
  PrimaryKeyDescriptor getPrimaryKeyDescriptor() const override;
  PrimaryKeyValue getPrimaryKeyValue() const override;

  std::string getBlobHash() const;
  S3Path getS3Path() const;
  uint64_t getCreated() const;
};

} // namespace database
} // namespace network
} // namespace comm
