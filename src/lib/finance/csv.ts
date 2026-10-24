export function escapeCsvCell(value: string) {
  const sanitized = value.replace(/\r?\n/g, " ").trim();
  const formulaSafe =
    sanitized.startsWith("=") ||
    sanitized.startsWith("+") ||
    sanitized.startsWith("-") ||
    sanitized.startsWith("@")
      ? `'${sanitized}`
      : sanitized;
  if (/[",]/.test(formulaSafe)) {
    return `"${formulaSafe.replace(/"/g, '""')}"`;
  }
  return formulaSafe;
}

export function buildCsv(headers: string[], rows: string[][]) {
  const lines = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => row.map(escapeCsvCell).join(",")),
  ];
  return lines.join("\r\n");
}
