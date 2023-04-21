#include "Base64.h"

#include <math.h>
#include <array>

namespace comm {

static constexpr std::array<char, 64> encode_table{
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
    'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
    'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '+', '/'};

static std::array<char, 4> encode_triplet(uint8_t a, uint8_t b, uint8_t c) {
  constexpr uint32_t SIX_BIT_MASK = 0b111111;
  const uint32_t concat_bits = (a << 16) | (b << 8) | c;
  const auto x = encode_table[(concat_bits >> 18) & SIX_BIT_MASK];
  const auto y = encode_table[(concat_bits >> 12) & SIX_BIT_MASK];
  const auto z = encode_table[(concat_bits >> 6) & SIX_BIT_MASK];
  const auto w = encode_table[concat_bits & SIX_BIT_MASK];
  return {x, y, z, w};
}

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

} // namespace comm
