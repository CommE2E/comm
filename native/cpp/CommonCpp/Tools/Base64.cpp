#include "Base64.h"

#include <math.h>
#include <algorithm>
#include <array>
#include <iterator>

// anonymous namespace to encapsulate internal utilities
namespace {
constexpr std::array<char, 64> encode_table{
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
    'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
    'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '+', '/'};

constexpr std::array<uint8_t, 256> decode_table{
    0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64,
    0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64,
    0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64,
    0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x3E, 0x64, 0x64, 0x64, 0x3F,
    0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x3B, 0x3C, 0x3D, 0x64, 0x64,
    0x64, 0x64, 0x64, 0x64, 0x64, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06,
    0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F, 0x10, 0x11, 0x12,
    0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x64, 0x64, 0x64, 0x64, 0x64,
    0x64, 0x1A, 0x1B, 0x1C, 0x1D, 0x1E, 0x1F, 0x20, 0x21, 0x22, 0x23, 0x24,
    0x25, 0x26, 0x27, 0x28, 0x29, 0x2A, 0x2B, 0x2C, 0x2D, 0x2E, 0x2F, 0x30,
    0x31, 0x32, 0x33, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64,
    0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64,
    0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64,
    0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64,
    0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64,
    0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64,
    0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64,
    0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64,
    0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64,
    0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64,
    0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x64,
    0x64, 0x64, 0x64, 0x64};

std::array<char, 4> encode_triplet(uint8_t a, uint8_t b, uint8_t c) {
  constexpr uint32_t SIX_BIT_MASK = 0b111111;
  const uint32_t concat_bits = (a << 16) | (b << 8) | c;
  const auto x = encode_table[(concat_bits >> 18) & SIX_BIT_MASK];
  const auto y = encode_table[(concat_bits >> 12) & SIX_BIT_MASK];
  const auto z = encode_table[(concat_bits >> 6) & SIX_BIT_MASK];
  const auto w = encode_table[concat_bits & SIX_BIT_MASK];
  return {x, y, z, w};
}

std::array<uint8_t, 3> decode_quad(char a, char b, char c, char d) {
  constexpr uint32_t BYTE_MASK = 0xff;
  const uint32_t concat_bytes = (decode_table[a] << 18) |
      (decode_table[b] << 12) | (decode_table[c] << 6) | decode_table[d];
  const uint8_t x = (concat_bytes >> 16) & BYTE_MASK;
  const uint8_t y = (concat_bytes >> 8) & BYTE_MASK;
  const uint8_t z = concat_bytes & BYTE_MASK;
  return {x, y, z};
}

inline bool is_valid_base64_char(char c) {
  return decode_table[c] != 0x64;
}

inline bool is_valid_base64_str(const std::string_view encoded_str) {
  if ((encoded_str.size() % 4) == 1) {
    return false;
  }

  // last two characters can be padding
  const auto first_pad = encoded_str.cend() - 2;
  const auto second_pad = std::next(first_pad);

  if (!std::all_of(encoded_str.cbegin(), first_pad, is_valid_base64_char)) {
    return false;
  }

  // two padding characters
  if (!is_valid_base64_char(*first_pad)) {
    return (*first_pad == '=') && (*second_pad == '=');
  }
  // one padding or no padding
  return is_valid_base64_char(*second_pad) || (*second_pad == '=');
}

} // anonymous namespace

namespace comm {

std::string Base64::encode(const std::vector<uint8_t> &data) {
  const auto size = data.size();
  const auto remainder = size % 3;
  const auto baseLength = size - remainder;

  // three bytes are encoded by 4 base64 chars
  std::string encoded;
  encoded.reserve(4 * ceil(size / 3));

  for (std::size_t i = 0; i < baseLength; i += 3) {
    const auto b64_chars = encode_triplet(data[i], data[i + 1], data[i + 2]);
    std::copy(begin(b64_chars), end(b64_chars), back_inserter(encoded));
  }

  if (remainder == 1) {
    const auto b64_chars = encode_triplet(data.back(), 0x00, 0x00);
    encoded.push_back(b64_chars[0]);
    encoded.push_back(b64_chars[1]);
    encoded.append("==");
  } else if (remainder == 2) {
    auto it = data.end() - 2;
    const auto b64_chars = encode_triplet(*it, *(it + 1), 0x00);
    std::copy_n(begin(b64_chars), 3, back_inserter(encoded));
    encoded.push_back('=');
  }
  return encoded;
}

std::vector<uint8_t> Base64::decode(const std::string_view base64String) {
  if (base64String.size() == 0) {
    return std::vector<uint8_t>{};
  }
  if (!is_valid_base64_str(base64String)) {
    throw std::runtime_error{"Invalid base64 string"};
  }

  const auto unpadded = base64String.substr(0, base64String.find_first_of('='));
  const auto full_quads = unpadded.size() / 4;

  // 4 base64 characters encode 3 bytes
  std::vector<uint8_t> decoded_bytes;
  decoded_bytes.reserve((full_quads + 1) * 3);

  for (size_t i = 0; i < full_quads; i++) {
    const auto quad = unpadded.substr(i * 4, 4);
    const auto bytes = decode_quad(quad[0], quad[1], quad[2], quad[3]);
    std::copy(bytes.begin(), bytes.end(), back_inserter(decoded_bytes));
  }

  const auto last_quad = unpadded.substr(full_quads * 4);
  if (last_quad.size() == 0) {
    return decoded_bytes;
  }

  // handle padding
  if ((last_quad.size() == 2) || (last_quad[2] == '=')) {
    const auto bytes = decode_quad(last_quad[0], last_quad[1], 'A', 'A');
    decoded_bytes.push_back(bytes[0]);
  } else {
    const auto bytes =
        decode_quad(last_quad[0], last_quad[1], last_quad[2], 'A');
    std::copy_n(bytes.begin(), 2, back_inserter(decoded_bytes));
  }

  return decoded_bytes;
}

} // namespace comm
