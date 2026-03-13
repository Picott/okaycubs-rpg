import fs from 'fs';
import path from 'path';

export interface Cub {
  id: string;
  name: string;
  image: string; // URL or /cubs/<file>
  number: number;
}

// Scan public/cubs directory for local images
// Falls back to placeholder if no images loaded yet
export function getLocalCubs(): Cub[] {
  const cubsDir = path.join(process.cwd(), 'public', 'cubs');

  let files: string[] = [];
  try {
    files = fs.readdirSync(cubsDir).filter(f =>
      /\.(png|jpg|jpeg|gif|webp)$/i.test(f)
    );
  } catch {
    // directory empty or missing
  }

  if (files.length === 0) {
    // Return placeholder cubs so the store is browsable without images
    return Array.from({ length: 6 }, (_, i) => ({
      id:     `demo-${i + 1}`,
      name:   `Cub #${String(i + 1).padStart(4, '0')}`,
      image:  '',
      number: i + 1,
    }));
  }

  return files.map((file, i) => {
    const base = path.basename(file, path.extname(file));
    const num  = parseInt(base.replace(/\D/g, '')) || i + 1;
    return {
      id:     base,
      name:   `Cub #${String(num).padStart(4, '0')}`,
      image:  `/cubs/${file}`,
      number: num,
    };
  }).sort((a, b) => a.number - b.number);
}
