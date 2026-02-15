import fs from 'fs';
import path from 'path';
import type { Plugin } from 'vite';

const MAGIC_BYTES: Record<string, { bytes: number[]; type: string }> = {
  'image/png': { bytes: [0x89, 0x50, 0x4E, 0x47], type: 'image/png' },
  'image/jpeg': { bytes: [0xFF, 0xD8, 0xFF], type: 'image/jpeg' },
  'image/webp': { bytes: [0x52, 0x49, 0x46, 0x46], type: 'image/webp' },
  'image/x-icon': { bytes: [0x00, 0x00, 0x01, 0x00], type: 'image/x-icon' },
};

function detectFileType(filePath: string): string | null {
  try {
    const buffer = fs.readFileSync(filePath);
    for (const [mime, { bytes }] of Object.entries(MAGIC_BYTES)) {
      if (bytes.every((b, i) => buffer[i] === b)) return mime;
    }
    return null;
  } catch {
    return null;
  }
}

export function validateManifestIcons(): Plugin {
  return {
    name: 'validate-manifest-icons',
    buildStart() {
      const manifestPath = path.resolve('public/manifest.json');
      if (!fs.existsSync(manifestPath)) return;

      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      const icons: { src: string; type?: string }[] = manifest.icons || [];
      const errors: string[] = [];
      const warnings: string[] = [];

      for (const icon of icons) {
        const filePath = path.resolve('public', icon.src.replace(/^\//, ''));

        if (!fs.existsSync(filePath)) {
          errors.push(`❌ Icon file not found: ${icon.src}`);
          continue;
        }

        const actualType = detectFileType(filePath);
        if (!actualType) {
          warnings.push(`⚠️ Could not detect file type for: ${icon.src}`);
          continue;
        }

        if (icon.type && icon.type !== actualType) {
          errors.push(
            `❌ Type mismatch for ${icon.src}: manifest declares "${icon.type}" but file is actually "${actualType}"`
          );
        }
      }

      for (const w of warnings) console.warn(`\x1b[33m${w}\x1b[0m`);
      for (const e of errors) console.error(`\x1b[31m${e}\x1b[0m`);

      if (errors.length > 0) {
        this.error(
          `Manifest icon validation failed with ${errors.length} error(s). Fix icon types in public/manifest.json to match actual file formats.`
        );
      }
    },
  };
}
