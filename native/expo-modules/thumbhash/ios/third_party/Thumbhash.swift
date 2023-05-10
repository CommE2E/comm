import Foundation
import UIKit

// Thumbhash implementation thanks to @evanw work
// https://github.com/evanw/thumbhash
// NOTE: Swift has an exponential-time type checker and compiling very simple
// expressions can easily take many seconds, especially when expressions involve
// numeric type constructors.
//
// This file deliberately breaks compound expressions up into separate variables
// to improve compile time even though this comes at the expense of readability.
// This is a known workaround for this deficiency in the Swift compiler.
//
// The following command is helpful when debugging Swift compile time issues:
//
//     swiftc ThumbHash.swift -Xfrontend -debug-time-function-bodies
//
// These optimizations brought the compile time for this file from around 2.5
// seconds to around 250ms (10x faster).
// NOTE: Swift's debug-build performance of for-in loops over numeric ranges is
// really awful. Debug builds compile a very generic indexing iterator thing
// that makes many nested calls for every iteration, which makes debug-build
// performance crawl.
//
// This file deliberately avoids for-in loops that loop for more than a few
// times to improve debug-build run time even though this comes at the expense
// of readability. Similarly unsafe pointers are used instead of array getters
// to avoid unnecessary bounds checks, which have extra overhead in debug builds
//
// These optimizations brought the run time to encode and decode 10 ThumbHashes
// in debug mode from 700ms to 70ms (10x faster).
// swiftlint:disable all
private func rgbaToThumbHash(w: Int, h: Int, rgba: Data) -> Data {
  // Encoding an image larger than 100x100 is slow with no benefit
  assert(w <= 100 && h <= 100)
  assert(rgba.count == w * h * 4)

  // Determine the average color
  var avg_r: Float32 = 0
  var avg_g: Float32 = 0
  var avg_b: Float32 = 0
  var avg_a: Float32 = 0
  rgba.withUnsafeBytes { rgba in
    var rgba = rgba.baseAddress!.bindMemory(to: UInt8.self,
                                            capacity: rgba.count)
    let n = w * h
    var i = 0
    while i < n {
      let alpha = Float32(rgba[3]) / 255
      avg_r += alpha / 255 * Float32(rgba[0])
      avg_g += alpha / 255 * Float32(rgba[1])
      avg_b += alpha / 255 * Float32(rgba[2])
      avg_a += alpha
      rgba = rgba.advanced(by: 4)
      i += 1
    }
  }
  if avg_a > 0 {
    avg_r /= avg_a
    avg_g /= avg_a
    avg_b /= avg_a
  }

  let hasAlpha = avg_a < Float32(w * h)
  let l_limit = hasAlpha ? 5 : 7 // Use fewer luminance bits if there's alpha
  let imax_wh = max(w, h)
  let iwl_limit = l_limit * w
  let ihl_limit = l_limit * h
  let fmax_wh = Float32(imax_wh)
  let fwl_limit = Float32(iwl_limit)
  let fhl_limit = Float32(ihl_limit)
  let flx = round(fwl_limit / fmax_wh)
  let fly = round(fhl_limit / fmax_wh)
  var lx = Int(flx)
  var ly = Int(fly)
  lx = max(1, lx)
  ly = max(1, ly)
  var lpqa = [Float32](repeating: 0, count: w * h * 4)

  // Convert the image from RGBA to LPQA (composite atop the average color)
  rgba.withUnsafeBytes { rgba in
    lpqa.withUnsafeMutableBytes { lpqa in
      var rgba = rgba.baseAddress!.bindMemory(to: UInt8.self,
                                              capacity: rgba.count)
      var lpqa = lpqa.baseAddress!.bindMemory(to: Float32.self,
                                              capacity: lpqa.count)
      let n = w * h
      var i = 0
      while i < n {
        let alpha = Float32(rgba[3]) / 255
        let r = avg_r * (1 - alpha) + alpha / 255 * Float32(rgba[0])
        let g = avg_g * (1 - alpha) + alpha / 255 * Float32(rgba[1])
        let b = avg_b * (1 - alpha) + alpha / 255 * Float32(rgba[2])
        lpqa[0] = (r + g + b) / 3
        lpqa[1] = (r + g) / 2 - b
        lpqa[2] = r - g
        lpqa[3] = alpha
        rgba = rgba.advanced(by: 4)
        lpqa = lpqa.advanced(by: 4)
        i += 1
      }
    }
  }

  // Encode using the DCT into DC (constant) and normalized AC (varying) terms
  let encodeChannel = { (channel: UnsafePointer<Float32>, nx: Int, ny: Int) ->
    (Float32, [Float32], Float32) in
    var dc: Float32 = 0
    var ac: [Float32] = []
    var scale: Float32 = 0
    var fx = [Float32](repeating: 0, count: w)
    fx.withUnsafeMutableBytes { fx in
      let fx = fx.baseAddress!.bindMemory(to: Float32.self, capacity: fx.count)
      var cy = 0
      while cy < ny {
        var cx = 0
        while cx * ny < nx * (ny - cy) {
          var ptr = channel
          var f: Float32 = 0
          var x = 0
          while x < w {
            let fw = Float32(w)
            let fxx = Float32(x)
            let fcx = Float32(cx)
            fx[x] = cos(Float32.pi / fw * fcx * (fxx + 0.5))
            x += 1
          }
          var y = 0
          while y < h {
            let fh = Float32(h)
            let fyy = Float32(y)
            let fcy = Float32(cy)
            let fy = cos(Float32.pi / fh * fcy * (fyy + 0.5))
            var x = 0
            while x < w {
              f += ptr.pointee * fx[x] * fy
              x += 1
              ptr = ptr.advanced(by: 4)
            }
            y += 1
          }
          f /= Float32(w * h)
          if cx > 0 || cy > 0 {
            ac.append(f)
            scale = max(scale, abs(f))
          } else {
            dc = f
          }
          cx += 1
        }
        cy += 1
      }
    }
    if scale > 0 {
      let n = ac.count
      var i = 0
      while i < n {
        ac[i] = 0.5 + 0.5 / scale * ac[i]
        i += 1
      }
    }
    return (dc, ac, scale)
  }
  let (
    (l_dc, l_ac, l_scale),
    (p_dc, p_ac, p_scale),
    (q_dc, q_ac, q_scale),
    (a_dc, a_ac, a_scale)
  ) = lpqa.withUnsafeBytes { lpqa in
    let lpqa = lpqa.baseAddress!.bindMemory(to: Float32.self,
                                            capacity: lpqa.count)
    return (
      encodeChannel(lpqa, max(3, lx), max(3, ly)),
      encodeChannel(lpqa.advanced(by: 1), 3, 3),
      encodeChannel(lpqa.advanced(by: 2), 3, 3),
      hasAlpha ? encodeChannel(lpqa.advanced(by: 3), 5, 5) : (1, [], 1)
    )
  }

  // Write the constants
  let isLandscape = w > h
  let fl_dc = round(63.0 * l_dc)
  let fp_dc = round(31.5 + 31.5 * p_dc)
  let fq_dc = round(31.5 + 31.5 * q_dc)
  let fl_scale = round(31.0 * l_scale)
  let il_dc = UInt32(fl_dc)
  let ip_dc = UInt32(fp_dc)
  let iq_dc = UInt32(fq_dc)
  let il_scale = UInt32(fl_scale)
  let ihasAlpha = UInt32(hasAlpha ? 1 : 0)
  let header24 = il_dc
    | (ip_dc << 6)
    | (iq_dc << 12)
    | (il_scale << 18)
    | (ihasAlpha << 23)
  let fp_scale = round(63.0 * p_scale)
  let fq_scale = round(63.0 * q_scale)
  let ilxy = UInt16(isLandscape ? ly : lx)
  let ip_scale = UInt16(fp_scale)
  let iq_scale = UInt16(fq_scale)
  let iisLandscape = UInt16(isLandscape ? 1 : 0)
  let header16 = ilxy | (ip_scale << 3) | (iq_scale << 9) | (iisLandscape << 15)
  var hash = Data(capacity: 25)
  hash.append(UInt8(header24 & 255))
  hash.append(UInt8((header24 >> 8) & 255))
  hash.append(UInt8(header24 >> 16))
  hash.append(UInt8(header16 & 255))
  hash.append(UInt8(header16 >> 8))
  var isOdd = false
  if hasAlpha {
    let fa_dc = round(15.0 * a_dc)
    let fa_scale = round(15.0 * a_scale)
    let ia_dc = UInt8(fa_dc)
    let ia_scale = UInt8(fa_scale)
    hash.append(ia_dc | (ia_scale << 4))
  }

  // Write the varying factors
  for ac in [l_ac, p_ac, q_ac] {
    for f in ac {
      let f15 = round(15.0 * f)
      let i15 = UInt8(f15)
      if isOdd {
        hash[hash.count - 1] |= i15 << 4
      } else {
        hash.append(i15)
      }
      isOdd = !isOdd
    }
  }
  if hasAlpha {
    for f in a_ac {
      let f15 = round(15.0 * f)
      let i15 = UInt8(f15)
      if isOdd {
        hash[hash.count - 1] |= i15 << 4
      } else {
        hash.append(i15)
      }
      isOdd = !isOdd
    }
  }
  return hash
}

func thumbHash(fromImage: UIImage) -> Data {
  let size = fromImage.size
  let w = Int(round(100 * size.width / max(size.width, size.height)))
  let h = Int(round(100 * size.height / max(size.width, size.height)))
  var rgba = Data(count: w * h * 4)
  rgba.withUnsafeMutableBytes { rgba in
    if
      let space = fromImage.cgImage?.colorSpace,
      let context = CGContext(
        data: rgba.baseAddress,
        width: w,
        height: h,
        bitsPerComponent: 8,
        bytesPerRow: w * 4,
        space: space,
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
      )
    {
      // EXIF orientation only works if you draw the UIImage, not the CGImage
      context.concatenate(CGAffineTransform(1, 0, 0, -1, 0, CGFloat(h)))
      UIGraphicsPushContext(context)
      fromImage.draw(in: CGRect(x: 0, y: 0, width: w, height: h))
      UIGraphicsPopContext()

      // Convert from premultiplied alpha to unpremultiplied alpha
      var rgba = rgba.baseAddress!.bindMemory(to: UInt8.self,
                                              capacity: rgba.count)
      let n = w * h
      var i = 0
      while i < n {
        let a = UInt16(rgba[3])
        if a > 0 && a < 255 {
          var r = UInt16(rgba[0])
          var g = UInt16(rgba[1])
          var b = UInt16(rgba[2])
          r = min(255, r * 255 / a)
          g = min(255, g * 255 / a)
          b = min(255, b * 255 / a)
          rgba[0] = UInt8(r)
          rgba[1] = UInt8(g)
          rgba[2] = UInt8(b)
        }
        rgba = rgba.advanced(by: 4)
        i += 1
      }
    }
  }
  return rgbaToThumbHash(w: w, h: h, rgba: rgba)
}
