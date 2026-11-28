/**
 * Small CSV reader for the parts import. Handles quoted cells (with commas, quotes and line breaks), CRLF, a UTF-8
 * byte-order mark, and the semicolon delimiter that Excel uses in many locales.
 */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^\uFEFF/, '');
  const firstLine = src.split(/\r?\n/, 1)[0] ?? '';
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === delimiter) {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(cell);
      cell = '';
      if (row.some((v) => v.trim() !== '')) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((v) => v.trim() !== '')) rows.push(row);
  return rows;
}

/** Column names the import understands, and the other spellings people use for them. */
const COLUMN_ALIASES: Record<string, string> = {
  sku: 'sku',
  namear: 'nameAr', arabicname: 'nameAr', namearabic: 'nameAr',
  nameen: 'nameEn', englishname: 'nameEn', nameenglish: 'nameEn',
  descar: 'descAr', descriptionar: 'descAr',
  descen: 'descEn', descriptionen: 'descEn',
  price: 'price',
  partcode: 'partCode', partnumber: 'partCode',
  oem: 'oemReference', oemreference: 'oemReference',
  brand: 'brand',
  country: 'countryOfOrigin', countryoforigin: 'countryOfOrigin', origin: 'countryOfOrigin',
  category: 'category',
  stock: 'stock', quantity: 'stock',
  models: 'models',
  yearfrom: 'yearFrom', fromyear: 'yearFrom',
  yearto: 'yearTo', toyear: 'yearTo',
};

export const IMPORT_COLUMNS = ['sku', 'name_ar', 'name_en', 'desc_ar', 'desc_en', 'price', 'part_code', 'oem', 'brand', 'country', 'category', 'stock', 'models', 'year_from', 'year_to'];

export const IMPORT_TEMPLATE = `${IMPORT_COLUMNS.join(',')}\nEXAMPLE-001,فلتر زيت,Oil filter,,,180,PC-001,,Mann,Germany,filters,25,logan|sandero,2012,2022\n`;

/** Turns CSV text into row objects keyed by the names the API expects. Unknown columns are ignored. */
export function csvToImportRows(text: string): { rows: Record<string, string>[]; hasSku: boolean } {
  const table = parseCsv(text);
  if (table.length < 1) return { rows: [], hasSku: false };
  const keys = table[0].map((h) => COLUMN_ALIASES[h.toLowerCase().replace(/[^a-z]/g, '')] ?? '');
  const rows = table.slice(1).map((cells) => {
    const obj: Record<string, string> = {};
    keys.forEach((key, i) => {
      if (key && cells[i] !== undefined) obj[key] = cells[i].trim();
    });
    return obj;
  });
  return { rows, hasSku: keys.includes('sku') };
}
