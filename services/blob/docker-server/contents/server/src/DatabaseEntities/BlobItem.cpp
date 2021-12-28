#include "BlobItem.h"

#include "AwsTools.h"

namespace comm {
namespace network {
namespace database {

const std::string BlobItem::FIELD_FILE_HASH = "blobHash";
const std::string BlobItem::FIELD_S3_PATH = "s3Path";
const std::string BlobItem::FIELD_CREATED = "created";

std::string BlobItem::tableName = BLOB_TABLE_NAME;

BlobItem::BlobItem(const std::string blobHash, const S3Path s3Path)
    : blobHash(blobHash), s3Path(s3Path) {
  this->validate();
}

BlobItem::BlobItem(const AttributeValues &itemFromDB) {
  this->assignItemFromDatabase(itemFromDB);
}

void BlobItem::validate() const {
  if (!this->blobHash.size()) {
    throw std::runtime_error("blobHash empty");
  }
  this->s3Path.validate();
}

void BlobItem::assignItemFromDatabase(const AttributeValues &itemFromDB) {
  try {
    this->blobHash = itemFromDB.at(BlobItem::FIELD_FILE_HASH).GetS();
    this->s3Path = S3Path(itemFromDB.at(BlobItem::FIELD_S3_PATH).GetS());
    this->created = std::stoll(
        std::string(itemFromDB.at(BlobItem::FIELD_CREATED).GetS()).c_str());
  } catch (std::out_of_range &e) {
    std::string errorMessage = "invalid blob item provided, ";
    errorMessage += e.what();
    throw std::runtime_error(errorMessage);
  }
  this->validate();
}

const std::string BlobItem::getTableName() const {
  return BlobItem::tableName;
}

const std::string BlobItem::getPrimaryKey() const {
  return BlobItem::FIELD_FILE_HASH;
}

const std::string BlobItem::getBlobHash() const {
  return this->blobHash;
}

const S3Path BlobItem::getS3Path() const {
  return this->s3Path;
}

const long long BlobItem::getCreated() const {
  return this->created;
}

} // namespace database
} // namespace network
} // namespace comm
