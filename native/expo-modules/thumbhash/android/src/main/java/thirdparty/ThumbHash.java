package thirdparty;

import androidx.annotation.NonNull;

// ThumbHash Java implementation thanks to @evanw https://github.com/evanw/thumbhash
public final class ThumbHash {
  /**
   * Encodes an RGBA image to a ThumbHash. RGB should not be premultiplied by A.
   *
   * @param w    The width of the input image. Must be ≤100px.
   * @param h    The height of the input image. Must be ≤100px.
   * @param rgba The pixels in the input image, row-by-row. Must have w*h*4 elements.
   * @return The ThumbHash as a byte array.
   */
  @NonNull
  public static byte[] rgbaToThumbHash(int w, int h, byte[] rgba) {
    // Encoding an image larger than 100x100 is slow with no benefit
    if (w > 100 || h > 100) throw new IllegalArgumentException(w + "x" + h + " doesn't fit in 100x100");

    // Determine the average color
    float avg_r = 0, avg_g = 0, avg_b = 0, avg_a = 0;
    for (int i = 0, j = 0; i < w * h; i++, j += 4) {
      float alpha = (rgba[j + 3] & 255) / 255.0f;
      avg_r += alpha / 255.0f * (rgba[j] & 255);
      avg_g += alpha / 255.0f * (rgba[j + 1] & 255);
      avg_b += alpha / 255.0f * (rgba[j + 2] & 255);
      avg_a += alpha;
    }
    if (avg_a > 0) {
      avg_r /= avg_a;
      avg_g /= avg_a;
      avg_b /= avg_a;
    }

    boolean hasAlpha = avg_a < w * h;
    int l_limit = hasAlpha ? 5 : 7; // Use fewer luminance bits if there's alpha
    int lx = Math.max(1, Math.round((float) (l_limit * w) / (float) Math.max(w, h)));
    int ly = Math.max(1, Math.round((float) (l_limit * h) / (float) Math.max(w, h)));
    float[] l = new float[w * h]; // luminance
    float[] p = new float[w * h]; // yellow - blue
    float[] q = new float[w * h]; // red - green
    float[] a = new float[w * h]; // alpha

    // Convert the image from RGBA to LPQA (composite atop the average color)
    for (int i = 0, j = 0; i < w * h; i++, j += 4) {
      float alpha = (rgba[j + 3] & 255) / 255.0f;
      float r = avg_r * (1.0f - alpha) + alpha / 255.0f * (rgba[j] & 255);
      float g = avg_g * (1.0f - alpha) + alpha / 255.0f * (rgba[j + 1] & 255);
      float b = avg_b * (1.0f - alpha) + alpha / 255.0f * (rgba[j + 2] & 255);
      l[i] = (r + g + b) / 3.0f;
      p[i] = (r + g) / 2.0f - b;
      q[i] = r - g;
      a[i] = alpha;
    }

    // Encode using the DCT into DC (constant) and normalized AC (varying) terms
    Channel l_channel = new Channel(Math.max(3, lx), Math.max(3, ly)).encode(w, h, l);
    Channel p_channel = new Channel(3, 3).encode(w, h, p);
    Channel q_channel = new Channel(3, 3).encode(w, h, q);
    Channel a_channel = hasAlpha ? new Channel(5, 5).encode(w, h, a) : null;

    // Write the constants
    boolean isLandscape = w > h;
    int header24 = Math.round(63.0f * l_channel.dc)
      | (Math.round(31.5f + 31.5f * p_channel.dc) << 6)
      | (Math.round(31.5f + 31.5f * q_channel.dc) << 12)
      | (Math.round(31.0f * l_channel.scale) << 18)
      | (hasAlpha ? 1 << 23 : 0);
    int header16 = (isLandscape ? ly : lx)
      | (Math.round(63.0f * p_channel.scale) << 3)
      | (Math.round(63.0f * q_channel.scale) << 9)
      | (isLandscape ? 1 << 15 : 0);
    int ac_start = hasAlpha ? 6 : 5;
    int ac_count = l_channel.ac.length + p_channel.ac.length + q_channel.ac.length
      + (hasAlpha ? a_channel.ac.length : 0);
    byte[] hash = new byte[ac_start + (ac_count + 1) / 2];
    hash[0] = (byte) header24;
    hash[1] = (byte) (header24 >> 8);
    hash[2] = (byte) (header24 >> 16);
    hash[3] = (byte) header16;
    hash[4] = (byte) (header16 >> 8);
    if (hasAlpha) hash[5] = (byte) (Math.round(15.0f * a_channel.dc)
      | (Math.round(15.0f * a_channel.scale) << 4));

    // Write the varying factors
    int ac_index = 0;
    ac_index = l_channel.writeTo(hash, ac_start, ac_index);
    ac_index = p_channel.writeTo(hash, ac_start, ac_index);
    ac_index = q_channel.writeTo(hash, ac_start, ac_index);
    if (hasAlpha) a_channel.writeTo(hash, ac_start, ac_index);
    return hash;
  }

  private static final class Channel {
    int nx;
    int ny;
    float dc;
    float[] ac;
    float scale;

    Channel(int nx, int ny) {
      this.nx = nx;
      this.ny = ny;
      int n = 0;
      for (int cy = 0; cy < ny; cy++)
        for (int cx = cy > 0 ? 0 : 1; cx * ny < nx * (ny - cy); cx++)
          n++;
      ac = new float[n];
    }

    Channel encode(int w, int h, float[] channel) {
      int n = 0;
      float[] fx = new float[w];
      for (int cy = 0; cy < ny; cy++) {
        for (int cx = 0; cx * ny < nx * (ny - cy); cx++) {
          float f = 0;
          for (int x = 0; x < w; x++)
            fx[x] = (float) Math.cos(Math.PI / w * cx * (x + 0.5f));
          for (int y = 0; y < h; y++) {
            float fy = (float) Math.cos(Math.PI / h * cy * (y + 0.5f));
            for (int x = 0; x < w; x++)
              f += channel[x + y * w] * fx[x] * fy;
          }
          f /= w * h;
          if (cx > 0 || cy > 0) {
            ac[n++] = f;
            scale = Math.max(scale, Math.abs(f));
          } else {
            dc = f;
          }
        }
      }
      if (scale > 0)
        for (int i = 0; i < ac.length; i++)
          ac[i] = 0.5f + 0.5f / scale * ac[i];
      return this;
    }

    int writeTo(byte[] hash, int start, int index) {
      for (float v : ac) {
        hash[start + (index >> 1)] |= Math.round(15.0f * v) << ((index & 1) << 2);
        index++;
      }
      return index;
    }
  }
}