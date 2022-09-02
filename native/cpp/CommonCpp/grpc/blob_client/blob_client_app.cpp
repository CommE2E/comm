#include "rust/src/lib.rs.h"

#include <cassert>
#include <chrono>
#include <iostream>
#include <stdexcept>

std::string join_rust_vec(::rust::Vec<::rust::String> data) {
  std::string buff;
  for (auto it : data) {
    buff += it.c_str();
  }
  return buff;
}

int main(int argc, char *argv[]) {
  try {
    ::rust::String holder{argv[1]};
    ::rust::String hash{argv[2]};
    ::rust::Vec<::rust::String> upload_data{
        ::rust::String{std::string(4000000, 'a')},
        ::rust::String{std::string(4000000, 'b')},
        ::rust::String{std::string(4000000, 'c')},
        ::rust::String{std::string(4000000, 'd')},
        ::rust::String{std::string(4000000, 'e')},
    };

    auto start = std::chrono::high_resolution_clock::now();
    auto upload_state = blob::initialize_upload_state_blocking();
    start_upload_blocking(upload_state, holder, hash);
    for (auto &chunk : upload_data) {
      upload_chunk_blocking(upload_state, chunk);
    }
    resume_upload_blocking(std::move(upload_state));
    ::rust::Vec<::rust::String> download_data;
    auto download_state = blob::initialize_download_state_blocking(holder);
    while (true) {
      if (!pull_chunk_blocking(download_state, download_data)) {
        break;
      }
    }
    auto end = std::chrono::high_resolution_clock::now();
    auto duration =
        std::chrono::duration_cast<std::chrono::milliseconds>(end - start);
    std::cout << "Download - upload duration: " << duration.count()
              << std::endl;
    assert(join_rust_vec(upload_data) == join_rust_vec(download_data));
  } catch (const std::exception &e) {
    std::cout << "Exception occurred: " << e.what() << std::endl;
  }
}