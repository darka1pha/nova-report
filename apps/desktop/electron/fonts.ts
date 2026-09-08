import { exec } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';

const execAsync = promisify(exec);

const STANDARD_FALLBACK_FONTS = [
  'Arial',
  'Arial Black',
  'Calibri',
  'Cambria',
  'Comic Sans MS',
  'Consolas',
  'Courier New',
  'Georgia',
  'Helvetica',
  'Impact',
  'Lucida Console',
  'Segoe UI',
  'Tahoma',
  'Times New Roman',
  'Trebuchet MS',
  'Verdana',
  // Persian / Arabic Fonts
  'Vazirmatn',
  'B Nazanin',
  'B Yekan',
  'Sahel',
  'Samim',
  'Shabnam',
  'IRANSans',
  'Dubai',
  'Traditional Arabic'
];

export async function getSystemFonts(): Promise<string[]> {
  const platform = os.platform();
  const fontSet = new Set<string>(STANDARD_FALLBACK_FONTS);

  try {
    if (platform === 'win32') {
      // Query Windows Font Registry
      const cmd = `powershell -Command "Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Fonts' | Get-Member -MemberType NoteProperty | Select-Object -ExpandProperty Name"`;
      const { stdout } = await execAsync(cmd, { timeout: 3000 });
      stdout
        .split(/\r?\n/)
        .map(f => f.replace(/\s*\([^)]*\)\s*$/g, '').trim())
        .filter(f => f.length > 0 && !f.startsWith('PS'))
        .forEach(f => fontSet.add(f));
    } else if (platform === 'darwin') {
      const { stdout } = await execAsync('system_profiler SPFontsDataType', { timeout: 3000 });
      const matches = stdout.match(/Family:\s+(.+)/g);
      if (matches) {
        matches.forEach(m => {
          const font = m.replace(/Family:\s+/, '').trim();
          if (font) fontSet.add(font);
        });
      }
    } else if (platform === 'linux') {
      const { stdout } = await execAsync('fc-list : family | sort -u', { timeout: 3000 });
      stdout
        .split('\n')
        .map(f => f.split(',')[0]?.trim() || '')
        .filter(f => f.length > 0)
        .forEach(f => fontSet.add(f));
    }
  } catch (err) {
    console.warn('System font discovery error, using fallback font list:', err);
  }

  return Array.from(fontSet).sort((a, b) => a.localeCompare(b));
}
