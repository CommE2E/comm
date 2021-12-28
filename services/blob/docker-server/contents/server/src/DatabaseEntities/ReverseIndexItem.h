#pragma once

#include "Item.h"

#include <string>

namespace comm {
namespace network {
namespace database {

class ReverseIndexItem : public Item {

  std::string holder;
  std::string blobHash;

  void validate() const override;

public:
  static std::string tableName;
  static const std::string FIELD_HOLDER;
  static const std::string FIELD_FILE_HASH;

  ReverseIndexItem() {
  }
  ReverseIndexItem(const std::string holder, const std::string blobHash);
  ReverseIndexItem(const AttributeValues &itemFromDB);

  void assignItemFromDatabase(const AttributeValues &itemFromDB) override;

  const std::string getTableName() const override;
  const std::string getPrimaryKey() const override;
  const std::string getHolder() const;
  const std::string getBlobHash() const;
};

} // namespace database
} // namespace network
} // namespace comm
