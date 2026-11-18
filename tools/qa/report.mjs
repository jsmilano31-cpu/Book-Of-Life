import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export function writeReport(output, file, results) {
  return writeFile(
    join(output, file),
    JSON.stringify(results, null, 2) + '\n',
    'utf8',
  );
}
