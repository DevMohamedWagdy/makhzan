/**
 * Minimal RFC 4180 CSV parser (quoted fields, escaped quotes, CRLF).
 * @returns {string[][]}
 */
export function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;

    const source = text.replace(/^﻿/, '');

    for (let index = 0; index < source.length; index++) {
        const char = source[index];

        if (inQuotes) {
            if (char === '"' && source[index + 1] === '"') {
                field += '"';
                index++;
            } else if (char === '"') {
                inQuotes = false;
            } else {
                field += char;
            }
            continue;
        }

        if (char === '"') {
            inQuotes = true;
        } else if (char === ',') {
            row.push(field);
            field = '';
        } else if (char === '\n' || char === '\r') {
            if (char === '\r' && source[index + 1] === '\n') {
                index++;
            }
            row.push(field);
            rows.push(row);
            row = [];
            field = '';
        } else {
            field += char;
        }
    }

    if (field !== '' || row.length) {
        row.push(field);
        rows.push(row);
    }

    return rows.filter((cells) => cells.some((cell) => cell.trim() !== ''));
}

/** Maps CSV rows to objects using the header row. */
export function csvToObjects(text) {
    const [header = [], ...rows] = parseCsv(text);
    const keys = header.map((key) => key.trim().toLowerCase());

    return rows.map((cells) => Object.fromEntries(keys.map((key, index) => [key, (cells[index] ?? '').trim()])));
}

export function toCsv(rows) {
    const escape = (value) => {
        const text = String(value ?? '');

        return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };

    return rows.map((row) => row.map(escape).join(',')).join('\r\n');
}

/** Triggers a browser download of a CSV (with BOM so Excel renders Arabic correctly). */
export function downloadCsv(filename, rows) {
    const blob = new Blob(['﻿' + toCsv(rows)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = Object.assign(document.createElement('a'), { href: url, download: filename });

    link.click();
    URL.revokeObjectURL(url);
}
