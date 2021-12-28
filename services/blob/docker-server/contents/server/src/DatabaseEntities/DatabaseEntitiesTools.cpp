#include "DatabaseEntitiesTools.h"

namespace comm {
namespace network {
namespace database {

template <> std::shared_ptr<BlobItem> createItemByType<BlobItem>() {
  return std::make_shared<BlobItem>();
}

template <>
std::shared_ptr<ReverseIndexItem> createItemByType<ReverseIndexItem>() {
  return std::make_shared<ReverseIndexItem>();
}

} // namespace database
} // namespace network
} // namespace comm
