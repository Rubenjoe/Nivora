export function escapeCsvCell(value: string) {
  const sanitized = value.replace(/[\r\n]+/g, " ").trim();
  const isNumeric = /^-?\d+(?:\.\d+)?$/.test(sanitized);
  const formulaSafe =
    !isNumeric &&
    (sanitized.startsWith("=") ||
      sanitized.startsWith("+") ||
      sanitized.startsWith("-") ||
      sanitized.startsWith("@"))
      ? `'${sanitized}`
      : sanitized;
  if (/[",\r\n]/.test(formulaSafe)) {
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
