import fs from 'fs';
import path from 'path';

export async function loadImageBuffer(imageUrl?: string): Promise<Buffer | null> {
  if (!imageUrl) return null;
  try {
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      const res = await fetch(imageUrl);
      if (!res.ok) return null;
      const ab = await res.arrayBuffer();
      return Buffer.from(ab);
    } else if (imageUrl.startsWith('data:image/')) {
      const b64 = imageUrl.split(',')[1];
      if (b64) return Buffer.from(b64, 'base64');
    } else if (imageUrl.startsWith('/uploads/')) {
      const localPath = path.join(process.cwd(), imageUrl);
      if (fs.existsSync(localPath)) {
        return fs.readFileSync(localPath);
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}
