/**
 * Converts an array of objects to CSV format and triggers download
 */
export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  columns?: { key: keyof T; header: string }[]
): void {
  if (data.length === 0) {
    console.warn("No data to export");
    return;
  }

  // Determine columns from first row if not provided
  const cols = columns || Object.keys(data[0]).map((key) => ({
    key: key as keyof T,
    header: formatHeader(key),
  }));

  // Create header row
  const headerRow = cols.map((col) => `"${col.header}"`).join(",");

  // Create data rows
  const dataRows = data.map((row) =>
    cols
      .map((col) => {
        const value = row[col.key];
        // Handle different value types
        if (value === null || value === undefined) {
          return '""';
        }
        if (typeof value === "number") {
          return value.toString();
        }
        if (value instanceof Date) {
          return `"${value.toISOString()}"`;
        }
        // Escape quotes in strings
        const stringValue = String(value).replace(/"/g, '""');
        return `"${stringValue}"`;
      })
      .join(",")
  );

  // Combine header and data
  const csvContent = [headerRow, ...dataRows].join("\n");

  // Create blob and download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format a camelCase or snake_case key into a readable header
 */
function formatHeader(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

/**
 * Format currency for CSV export
 */
export function formatCurrencyForExport(value: number): string {
  return value.toFixed(2);
}

/**
 * Format date for CSV export
 */
export function formatDateForExport(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().split("T")[0];
}
