#include "rust/src/lib.rs.h"

#include <iostream>
#include <stdexcept>

int main() {
  ::rust::String holder("test.holder.v0");
  ::rust::String hash("test.hash.v0");
  ::BlobData data{
      {1, 2, 3, 4, 5},
      {5},
  };
  try {
    bool data_exists =
        put_blob_sync(holder, hash, ::rust::Box<::BlobData>(data));
    std::cout << "Data exists: " << data_exists << std::endl;
  } catch (const std::exception &e) {
    std::cout << "Exception occurred: " << e.what() << std::endl;
  }
  return 0;
}