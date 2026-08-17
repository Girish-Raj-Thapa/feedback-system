export function escapeCSV(value: any): string {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  // If the value contains commas, quotes, or newlines, enclose it in quotes and escape internal quotes
  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

export function generateCSV(headers: string[], data: any[][]): string {
  const headerRow = headers.map(escapeCSV).join(',');
  const dataRows = data.map((row) => row.map(escapeCSV).join(','));
  return [headerRow, ...dataRows].join('\n');
}
