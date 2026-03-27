import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function getUploadsDir() {
  const configured = process.env.UPLOADS_DIR?.trim();
  const resolved = configured
    ? path.resolve(process.cwd(), configured)
    : path.join(__dirname, '../../uploads');
  fs.mkdirSync(resolved, { recursive: true });
  return resolved;
}
