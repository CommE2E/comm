#include "ReverseIndexItem.h"

#include "AwsTools.h"

namespace comm {
namespace network {
namespace database {

const std::string ReverseIndexItem::FIELD_HOLDER = "holder";
const std::string ReverseIndexItem::FIELD_BLOB_HASH = "blobHash";

std::string ReverseIndexItem::tableName = REVERSE_INDEX_TABLE_NAME;

ReverseIndexItem::ReverseIndexItem(
    const std::string holder,
    const std::string blobHash)
    : holder(holder), blobHash(blobHash) {
  this->validate();
}
ReverseIndexItem::ReverseIndexItem(const AttributeValues &itemFromDB) {
  this->assignItemFromDatabase(itemFromDB);
}

void ReverseIndexItem::validate() const {
  if (!this->holder.size()) {
    throw std::runtime_error("reverse index empty");
  }
  if (!this->blobHash.size()) {
    throw std::runtime_error("blobHash empty");
  }
}

void ReverseIndexItem::assignItemFromDatabase(
    const AttributeValues &itemFromDB) {
  try {
    this->holder = itemFromDB.at(ReverseIndexItem::FIELD_HOLDER).GetS();
    this->blobHash = itemFromDB.at(ReverseIndexItem::FIELD_BLOB_HASH).GetS();
  } catch (std::out_of_range &e) {
    std::string errorMessage = "invalid reverse index item provided, ";
    errorMessage += e.what();
    throw std::runtime_error(errorMessage);
  }
  this->validate();
}

std::string ReverseIndexItem::getTableName() const {
  return ReverseIndexItem::tableName;
}

std::string ReverseIndexItem::getPrimaryKey() const {
  return ReverseIndexItem::FIELD_HOLDER;
}

std::string ReverseIndexItem::getHolder() const {
  return this->holder;
}

std::string ReverseIndexItem::getBlobHash() const {
  return this->blobHash;
}

} // namespace database
} // namespace network
} // namespace comm
