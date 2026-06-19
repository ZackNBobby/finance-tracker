// parser.js — DBS PDF statement parser using PDF.js

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const MONTH_MAP = {
  JAN:1,FEB:2,MAR:3,APR:4,MAY:5,JUN:6,JUL:7,AUG:8,SEP:9,OCT:10,NOV:11,DEC:12
};

function parseDateStr(str, fallbackYear) {
  str = str.trim().toUpperCase();

  // DD MMM YYYY  or  DD MMM
  let m = str.match(/^(\d{1,2})\s+([A-Z]{3})(?:\s+(\d{4}))?/);
  if (m) {
    const day = parseInt(m[1]);
    const mon = MONTH_MAP[m[2]];
    const yr  = m[3] ? parseInt(m[3]) : (fallbackYear || new Date().getFullYear());
    if (mon && day >= 1 && day <= 31) return new Date(yr, mon - 1, day);
  }

  // DD/MM/YYYY
  m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]));

  return null;
}

function parseAmount(str) {
  return parseFloat(str.replace(/,/g, ''));
}

// ─── text extraction ───────────────────────────────────────────────────────

async function extractLines(arrayBuffer) {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const allItems = [];
  let yOffset = 0;

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const tc   = await page.getTextContent();
    const vp   = page.getViewport({ scale: 1 });

    for (const item of tc.items) {
      if (item.str && item.str.trim()) {
        allItems.push({
          text: item.str,
          x: item.transform[4],
          y: item.transform[5] + yOffset,
          page: p,
        });
      }
    }
    yOffset += vp.height + 120;
  }

  // Cluster into "lines" by Y position (±4 px tolerance)
  const lineMap = new Map();
  for (const item of allItems) {
    const yKey = Math.round(item.y / 4) * 4;
    if (!lineMap.has(yKey)) lineMap.set(yKey, []);
    lineMap.get(yKey).push(item);
  }

  return [...lineMap.entries()]
    .sort(([ya, ia], [yb, ib]) => {
      if (ia[0].page !== ib[0].page) return ia[0].page - ib[0].page;
      return yb - ya; // higher Y = earlier in the page (PDF coords)
    })
    .map(([, items]) => {
      items.sort((a, b) => a.x - b.x);
      return items.map(i => i.text).join(' ').replace(/\s{2,}/g, ' ').trim();
    })
    .filter(l => l.length > 0);
}

// ─── statement type detection ──────────────────────────────────────────────

function detectType(lines) {
  const sample = lines.slice(0, 60).join(' ').toUpperCase();
  if (/CREDIT CARD|CARD STATEMENT|POSTING DATE|CARD NO\.|CARD NUMBER/.test(sample)) return 'credit';
  if (/WITHDRAWAL|DEPOSIT|BALANCE B\/F|SAVINGS ACCOUNT|CURRENT ACCOUNT|MULTIPLIER|CONSOLIDATED/.test(sample)) return 'bank';
  return 'unknown';
}

function extractYear(lines) {
  for (const line of lines.slice(0, 30)) {
    const m = line.match(/\b(20\d{2})\b/);
    if (m) return parseInt(m[1]);
  }
  return new Date().getFullYear();
}

// ─── credit card parser ────────────────────────────────────────────────────

// DBS CC lines: "DD MMM  DD MMM  DESCRIPTION  AMOUNT [CR]"
const CC_DUAL = /^(\d{1,2}\s+[A-Z]{3})\s+(\d{1,2}\s+[A-Z]{3})\s+(.+?)\s+([\d,]+\.\d{2})\s*(CR)?$/i;
// Some CC statements only show one date
const CC_SINGLE = /^(\d{1,2}\s+[A-Z]{3})\s+(.+?)\s+([\d,]+\.\d{2})\s*(CR|-)?$/i;

const CC_SKIP = /BALANCE|PAYMENT RECEIVED|PAYMENT - THANK|SUBTOTAL|SUB-TOTAL|CREDIT LIMIT|MINIMUM|ANNUAL FEE|PREV BALANCE|STATEMENT DATE|TRANSACTION DATE|DESCRIPTION|AMOUNT|PAGE \d/i;

function parseCreditCard(lines, year) {
  const txns = [];
  for (const line of lines) {
    if (CC_SKIP.test(line)) continue;

    let m = CC_DUAL.exec(line);
    if (m) {
      const [, txDate, , desc, amtStr, cr] = m;
      const amt = parseAmount(amtStr);
      const date = parseDateStr(txDate, year);
      if (date && amt > 0 && amt < 100000 && desc.length > 1) {
        txns.push({ date, description: desc.trim(), amount: amt, type: /CR/i.test(cr || '') ? 'credit' : 'debit', src: 'cc' });
      }
      continue;
    }

    m = CC_SINGLE.exec(line);
    if (m) {
      const [, txDate, desc, amtStr, flag] = m;
      if (/^(DATE|DESCRIPTION|AMOUNT|POSTING|TRANSACTION)$/i.test(desc.trim())) continue;
      const amt = parseAmount(amtStr);
      const date = parseDateStr(txDate, year);
      if (date && amt > 0 && amt < 100000 && desc.length > 1) {
        txns.push({ date, description: desc.trim(), amount: amt, type: /CR|-/i.test(flag || '') ? 'credit' : 'debit', src: 'cc' });
      }
    }
  }
  return txns;
}

// ─── bank statement parser ─────────────────────────────────────────────────

// DBS bank lines: "DD MMM YYYY  DESCRIPTION  [withdrawal]  [deposit]  balance"
const BANK_RE = /^(\d{1,2}\s+[A-Z]{3}(?:\s+\d{4})?)\s+(.+?)\s+([\d,]+\.\d{2})(?:\s+([\d,]+\.\d{2}))?(?:\s+([\d,]+\.\d{2}))?$/i;
const BANK_SKIP = /BALANCE\s+B\/F|BALANCE\s+C\/F|BROUGHT FORWARD|CARRIED FORWARD|DATE\s+TRANSACTION|WITHDRAWAL\s+DEPOSIT|DEPOSIT\s+BALANCE|PAGE \d|SUBTOTAL/i;

function parseBankStatement(lines, year) {
  const txns = [];
  for (const line of lines) {
    if (BANK_SKIP.test(line)) continue;

    const m = BANK_RE.exec(line);
    if (!m) continue;

    const [, dateStr, desc, a1, a2, a3] = m;
    if (/^(DATE|DESCRIPTION|WITHDRAWAL|DEPOSIT|BALANCE|AMOUNT)$/i.test(desc.trim())) continue;

    const date = parseDateStr(dateStr.replace(/\s+\d{4}$/, ''), year);
    if (!date) continue;

    const isIncome = /SALARY|CREDIT|BONUS|DIVIDEND|REFUND|CASHBACK|INTEREST\s+CR|RECEIVED|IBG CREDIT|INCOMING/i.test(desc);

    let amount, type;
    if (a3) {
      // 3 amounts → withdrawal / deposit / balance
      const w = parseAmount(a1), d = parseAmount(a2 || '0');
      if (isIncome || d > 0 && w === 0) { amount = d || parseAmount(a1); type = 'credit'; }
      else { amount = w; type = 'debit'; }
    } else if (a2) {
      // 2 amounts → transaction / balance
      amount = parseAmount(a1);
      type = isIncome ? 'credit' : 'debit';
    } else {
      amount = parseAmount(a1);
      type = isIncome ? 'credit' : 'debit';
    }

    if (amount > 0 && amount < 500000 && desc.length > 1) {
      txns.push({ date, description: desc.trim(), amount, type, src: 'bank' });
    }
  }
  return txns;
}

// ─── deduplication ─────────────────────────────────────────────────────────

function dedupe(txns) {
  const seen = new Set();
  return txns.filter(t => {
    const key = `${t.date.toDateString()}|${t.amount}|${t.description}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── public API ────────────────────────────────────────────────────────────

async function parseStatementPDF(file, onProgress) {
  onProgress?.('Reading PDF…');
  const buf = await file.arrayBuffer();

  onProgress?.('Extracting text from pages…');
  const lines = await extractLines(buf);

  const stmtType = detectType(lines);
  const year     = extractYear(lines);
  onProgress?.(`Detected: ${stmtType === 'credit' ? 'Credit Card' : stmtType === 'bank' ? 'Bank Account' : 'Unknown'} statement`);

  let txns = [];
  if (stmtType === 'bank') {
    txns = parseBankStatement(lines, year);
    if (txns.length === 0) txns = parseCreditCard(lines, year); // fallback
  } else {
    txns = parseCreditCard(lines, year);
    if (txns.length === 0) txns = parseBankStatement(lines, year); // fallback
  }

  txns = dedupe(txns).filter(t => t.date && t.amount > 0 && t.description.length > 1);
  onProgress?.(`Found ${txns.length} transaction${txns.length !== 1 ? 's' : ''}`);

  return { transactions: txns, statementType: stmtType, year, lineCount: lines.length };
}
