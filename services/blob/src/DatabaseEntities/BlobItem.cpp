#include "BlobItem.h"

#include "Constants.h"

namespace comm {
namespace network {
namespace database {

const std::string BlobItem::FIELD_BLOB_HASH = "blobHash";
const std::string BlobItem::FIELD_S3_PATH = "s3Path";
const std::string BlobItem::FIELD_CREATED = "created";

const std::string BlobItem::TABLE_NAME = BLOB_TABLE_NAME;

BlobItem::BlobItem(
    const std::string blobHash,
    const S3Path s3Path,
    uint64_t created)
    : blobHash(blobHash), s3Path(s3Path), created(created) {
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
    this->blobHash = itemFromDB.at(BlobItem::FIELD_BLOB_HASH).GetS();
    this->s3Path = S3Path(itemFromDB.at(BlobItem::FIELD_S3_PATH).GetS());
    this->created = std::stoll(
        std::string(itemFromDB.at(BlobItem::FIELD_CREATED).GetS()).c_str());
  } catch (std::logic_error &e) {
    throw std::runtime_error(
        "invalid blob item provided, " + std::string(e.what()));
  }
  this->validate();
}

std::string BlobItem::getTableName() const {
  return BlobItem::TABLE_NAME;
}

PrimaryKeyDescriptor BlobItem::getPrimaryKeyDescriptor() const {
  return PrimaryKeyDescriptor(BlobItem::FIELD_BLOB_HASH);
}

PrimaryKeyValue BlobItem::getPrimaryKeyValue() const {
  return PrimaryKeyValue(this->blobHash);
}

std::string BlobItem::getBlobHash() const {
  return this->blobHash;
}

S3Path BlobItem::getS3Path() const {
  return this->s3Path;
}

uint64_t BlobItem::getCreated() const {
  return this->created;
}

} // namespace database
} // namespace network
} // namespace comm
