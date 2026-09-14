import { zipSync, strToU8 } from 'fflate';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Expense, PaymentSource, catById, wnLabel } from './data';

// Builds a real .xlsx workbook on-device and hands it to the share sheet. An .xlsx is just a
// zip of SpreadsheetML parts, so it is written by hand here rather than pulling in a
// spreadsheet library that needs Node polyfills. Three sheets:
//   Expenses          — every expense, oldest first, with a filter row and a SUM total
//   Monthly summary   — per month Needs / Wants / Invest / Total, a subtotal per year
//   Category by month — month × category pivot

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// Style ids — indexes into cellXfs in STYLES below.
const S = { text: 0, header: 1, date: 2, money: 3, bold: 4, boldMoney: 5 } as const;

type Cell = string | number | null | { v: number | string; s?: number; f?: string };
type Row = { cells: Cell[]; style?: number };
interface Sheet { name: string; widths: number[]; rows: Row[]; filter?: boolean; }

const esc = (s: string) =>
  // XML 1.0 forbids most control characters, even escaped.
  s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function colName(i: number): string {
  let n = i + 1, s = '';
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

// Excel date serial for the expense's local calendar day.
const excelDate = (d: Date) => (Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(1899, 11, 30)) / 86400000;
const round2 = (n: number) => Math.round(n * 100) / 100;

function cellXml(cell: Cell, ref: string, rowStyle?: number): string {
  if (cell === null || cell === '') return '';
  const c = typeof cell === 'object' ? cell : { v: cell };
  const style = c.s ?? rowStyle ?? (typeof c.v === 'number' ? S.money : S.text);
  const s = style ? ` s="${style}"` : '';
  if (c.f) return `<c r="${ref}"${s}><f>${esc(c.f)}</f><v>${c.v}</v></c>`;
  if (typeof c.v === 'number') return `<c r="${ref}"${s}><v>${c.v}</v></c>`;
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${esc(c.v)}</t></is></c>`;
}

function sheetXml(sheet: Sheet): string {
  const lastCol = colName(Math.max(1, sheet.widths.length) - 1);
  const rows = sheet.rows.map((r, ri) =>
    `<row r="${ri + 1}">${r.cells.map((c, ci) => cellXml(c, colName(ci) + (ri + 1), r.style)).join('')}</row>`,
  ).join('');
  const cols = sheet.widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('');
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
    + '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
    + `<cols>${cols}</cols><sheetData>${rows}</sheetData>`
    + (sheet.filter ? `<autoFilter ref="A1:${lastCol}${filterEnd(sheet)}"/>` : '')
    + '</worksheet>';
}

// The filter covers the header and data rows, not the trailing total row.
const filterEnd = (sheet: Sheet) => Math.max(1, sheet.rows.length - 1);

const STYLES = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
  + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
  + '<numFmts count="2"><numFmt numFmtId="164" formatCode="dd mmm yyyy"/><numFmt numFmtId="165" formatCode="#,##0.00"/></numFmts>'
  + '<fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>'
  + '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF07A35F"/><bgColor indexed="64"/></patternFill></fill></fills>'
  + '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
  + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
  + '<cellXfs count="6">'
  + '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
  + '<xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>'
  + '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'
  + '<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'
  + '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>'
  + '<xf numFmtId="165" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyNumberFormat="1"/>'
  + '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
  + '</styleSheet>';

function workbookZip(sheets: Sheet[]): Uint8Array {
  const sheetEntries = sheets.map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('');
  const definedNames = sheets
    .map((s, i) => s.filter ? `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${esc(s.name)}'!$A$1:$${colName(s.widths.length - 1)}$${filterEnd(s)}</definedName>` : '')
    .join('');
  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
      + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
      + '<Default Extension="xml" ContentType="application/xml"/>'
      + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
      + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
      + sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')
      + '</Types>'),
    '_rels/.rels': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
      + '</Relationships>'),
    'xl/workbook.xml': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
      + `<sheets>${sheetEntries}</sheets>`
      + (definedNames ? `<definedNames>${definedNames}</definedNames>` : '')
      + '</workbook>'),
    'xl/_rels/workbook.xml.rels': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')
      + `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`
      + '</Relationships>'),
    'xl/styles.xml': strToU8(STYLES),
  };
  sheets.forEach((s, i) => { files[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(sheetXml(s)); });
  return zipSync(files, { level: 6 });
}

// ---- sheet contents ----

interface MonthBucket { year: number; month: number; count: number; need: number; want: number; invest: number; total: number; byCat: Record<string, number>; }

export function buildExpenseWorkbook(expenses: Expense[], accounts: PaymentSource[]): Uint8Array {
  const sorted = [...expenses].sort((a, b) => a.date.localeCompare(b.date));
  const accountName = (id?: string | null) => (id ? accounts.find((a) => a.id === id)?.name ?? '' : '');

  // Expenses
  const detailHeader = ['Date', 'Year', 'Month', 'Description', 'Category', 'Type', 'Payment source', 'Amount (INR)', 'Receipt'];
  const detailRows: Row[] = [{ cells: detailHeader, style: S.header }];
  for (const e of sorted) {
    const d = new Date(e.date);
    detailRows.push({
      cells: [
        { v: excelDate(d), s: S.date }, { v: d.getFullYear(), s: S.text }, MONTHS[d.getMonth()],
        e.desc, catById(e.cat).name, wnLabel(e.wn), accountName(e.account), { v: round2(e.amount), s: S.money },
        e.receipt ? 'Yes' : '',
      ],
    });
  }
  const grand = round2(sorted.reduce((s, e) => s + e.amount, 0));
  const lastData = sorted.length + 1;
  detailRows.push({
    cells: ['Total', null, null, `${sorted.length} expenses`, null, null, null,
      { v: grand, s: S.boldMoney, f: sorted.length ? `SUM(H2:H${lastData})` : undefined }, null],
    style: S.bold,
  });

  // Month buckets, chronological.
  const buckets = new Map<string, MonthBucket>();
  for (const e of sorted) {
    const d = new Date(e.date);
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
    let b = buckets.get(key);
    if (!b) { b = { year: d.getFullYear(), month: d.getMonth(), count: 0, need: 0, want: 0, invest: 0, total: 0, byCat: {} }; buckets.set(key, b); }
    b.count++;
    b.total += e.amount;
    if (e.wn === 'INVEST') b.invest += e.amount; else if (e.wn === 'WANT') b.want += e.amount; else b.need += e.amount;
    b.byCat[e.cat] = (b.byCat[e.cat] ?? 0) + e.amount;
  }
  const months = [...buckets.values()];

  // Monthly summary, with a subtotal after each year and a grand total.
  const summaryRows: Row[] = [{ cells: ['Year', 'Month', 'Expenses', 'Needs', 'Wants', 'Invest', 'Total'], style: S.header }];
  const sumOf = (list: MonthBucket[], k: 'need' | 'want' | 'invest' | 'total') => round2(list.reduce((s, b) => s + b[k], 0));
  const years = [...new Set(months.map((b) => b.year))];
  for (const y of years) {
    const inYear = months.filter((b) => b.year === y);
    for (const b of inYear) {
      summaryRows.push({ cells: [{ v: y, s: S.text }, MONTHS[b.month], { v: b.count, s: S.text }, round2(b.need), round2(b.want), round2(b.invest), round2(b.total)] });
    }
    summaryRows.push({
      cells: [`${y} total`, null, { v: inYear.reduce((s, b) => s + b.count, 0), s: S.bold }, sumOf(inYear, 'need'), sumOf(inYear, 'want'), sumOf(inYear, 'invest'), sumOf(inYear, 'total')],
      style: S.boldMoney,
    });
  }
  summaryRows.push({
    cells: ['All time', null, { v: sorted.length, s: S.bold }, sumOf(months, 'need'), sumOf(months, 'want'), sumOf(months, 'invest'), sumOf(months, 'total')],
    style: S.boldMoney,
  });
  // Text cells in bold rows would otherwise pick up the money style.
  for (const r of summaryRows.slice(1)) if (r.style === S.boldMoney && typeof r.cells[0] === 'string') r.cells[0] = { v: r.cells[0], s: S.bold };

  // Category by month — only categories that were actually used, in order of total spend.
  const catTotals: Record<string, number> = {};
  for (const e of sorted) catTotals[e.cat] = (catTotals[e.cat] ?? 0) + e.amount;
  const catIds = Object.keys(catTotals).sort((a, b) => catTotals[b] - catTotals[a]);
  const pivotRows: Row[] = [{ cells: ['Year', 'Month', ...catIds.map((id) => catById(id).name), 'Total'], style: S.header }];
  for (const b of months) {
    pivotRows.push({ cells: [{ v: b.year, s: S.text }, MONTHS[b.month], ...catIds.map((id) => (b.byCat[id] ? round2(b.byCat[id]) : null)), { v: round2(b.total), s: S.boldMoney }] });
  }
  pivotRows.push({ cells: [{ v: 'All time', s: S.bold }, null, ...catIds.map((id) => round2(catTotals[id])), grand], style: S.boldMoney });

  return workbookZip([
    { name: 'Expenses', widths: [13, 7, 11, 34, 18, 9, 18, 15, 9], rows: detailRows, filter: true },
    { name: 'Monthly summary', widths: [12, 12, 10, 14, 14, 14, 15], rows: summaryRows },
    { name: 'Category by month', widths: [12, 12, ...catIds.map(() => 15), 15], rows: pivotRows },
  ]);
}

// Writes the workbook to the cache directory and opens the share sheet (save to Files,
// Drive, mail, ...). Resolves false when this device has no sharing support.
export async function shareExpenseWorkbook(expenses: Expense[], accounts: PaymentSource[]): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) return false;
  const now = new Date();
  const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const file = new File(Paths.cache, `SpendWise-expenses-${stamp}.xlsx`);
  if (file.exists) file.delete();
  file.create();
  file.write(buildExpenseWorkbook(expenses, accounts));
  await Sharing.shareAsync(file.uri, { mimeType: XLSX_MIME, UTI: 'org.openxmlformats.spreadsheetml.sheet', dialogTitle: 'Export expenses' });
  return true;
}
