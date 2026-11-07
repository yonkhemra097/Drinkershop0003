export function exportCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
  const escapeCell = (value: string | number) => {
    const rawCell = String(value);
    const cell = typeof value === 'string' && /^\s*[=+\-@]/.test(rawCell) ? `'${rawCell}` : rawCell;
    return `"${cell.replace(/"/g, '""')}"`;
  };
  const content = [headers, ...rows].map((row) => row.map(escapeCell).join(',')).join('\r\n');
  const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
