/*******************************************************
 * DESK COLLECTION ANALYTICS — BACKEND (Apps Script)
 * Final Version — semua endpoint termasuk referensi
 *******************************************************/

/*** ============ CFG ============ ***/
const CFG = {
  SPREADSHEET_ID: '1zcWzcEN_R1qClSKPsvp2Fica_j7iDwq_Qqcg3Mude3k',
  // Spreadsheet rekap pembayaran per TL (1 tab per TL) — dipakai Analisa Bucket
  DATABAYAR_ID: '17hlBKEJjh5UJJQQATcnr-nZl_n3zfjIxQaa7TCFx8wQ',
  SHEET_ALL_DATA: 'All Data',
  SHEET_REFERENSI: 'Referensi Akun',
  SHEET_VIOLATION: 'VIOLATION',
  SHEET_RANK: 'DATA RANK',
  HEADER_ROW: 1,
  DATA_START_ROW: 2,
  RANK_DATA_START_ROW: 3 // sheet "DATA RANK": row 1 = judul blok, row 2 = header kolom, data mulai row 3
};

/*** ============ VIOLATION COLUMN MAPPING (0-based, A=0) ============ ***/
// A=NO, B=TANGGAL MASUK, C=TANGGAL KELUAR, D=DURASI PENYELESAIAN
// E=NAMA AGEN, F=APLIKASI, G=BUCKET, H=LEADER, I=AKUN, J=NAMA BORROWER
// K=KANAL PENGADUAN, L=KASUS, M=NAMA QC HANDLE
// N=STATUS EKSTERNAL, O=PUNISHMENT EKSTERNAL
// P=STATUS INTERNAL, Q=PUNISHMENT INTERNAL
// R=BUKTI LAPORAN, S=RIWAYAT HANDLE CASE, T=TANGGAL KOMPLAIN
// U=FILE FEEDBACK, V=DENDA, W=KETERANGAN TAMBAHAN
// X=BUKTI LAPORAN (MANDARIN), Y=FILE FEEDBACK (MANDARIN)
// Z=STATUS VALIDASI, AA=KETERANGAN MR ALVIN
const VCOL = {
  NO:0, TGL_MASUK:1, TGL_KELUAR:2, DURASI:3,
  NAMA_AGEN:4, APLIKASI:5, BUCKET:6, LEADER:7,
  AKUN:8, NAMA_BORROWER:9, KANAL:10, KASUS:11,
  NAMA_QC:12, STATUS_EXT:13, PUNISHMENT_EXT:14,
  STATUS_INT:15, PUNISHMENT_INT:16,
  BUKTI_LAPORAN:17, RIWAYAT:18, TGL_KOMPLAIN:19,
  FILE_FEEDBACK:20, DENDA:21, KET_TAMBAHAN:22,
  BUKTI_LAPORAN_CN:23, FILE_FEEDBACK_CN:24,
  STATUS_VALIDASI:25, KET_ALVIN:26
};
const VTOTAL_COLS = 27;

/*** ============ COLUMN MAPPING (0-based, A=0) ============ ***/
const COL = {
  TAHUN: 0, BULAN: 1, TANGGAL: 2, APLIKASI: 3, BUCKET: 4,
  ABSENSI: 5, TEAM_LEADER: 6, AGENT: 7, NAMA_AKUN: 8,
  ALAT_WA: 9, ALAT_GOJEK: 10, TOTAL_DATA: 11, DATA_BARU: 12,
  OS_DATA_BARU: 13, DAILY_PAYMENT: 14, JML_DATA_BAYAR: 15,
  RATE: 16, AUTOCALL: 17, CALL_MANUAL: 18, CALL_TERHUBUNG: 19,
  SENTUH_WA: 20, SENTUH_GOJEK: 21, RESPON_WA: 22, RESPON_GOJEK: 23,
  WA_BLOKIR: 24, PTP: 25, PTP_BAYAR: 26, CATATAN_SPV: 27,
  SENTUH_WABA: 28, RESPON_WABA: 29, SMS_MANUAL: 30,
  RESPON_SMS_MANUAL: 31, PAYMENT_OVERTIME: 32
};

const TOTAL_COLS = 33;

const REF_COL = {
  SUPERVISOR: 0,
  APLIKASI: 1,
  BUCKET: 2,
  DPD: 3,
  JAN: 4,      // E..P = Januari..Desember
  TAHUN: 16    // Q = TAHUN (1 baris per Supervisor+Aplikasi+Bucket per tahun)
};
const REF_TOTAL_COLS = 17; // A sampai Q
// Baris Referensi Akun yang kolom TAHUN-nya masih kosong dianggap tahun ini
// (data lama sebelum kolom TAHUN ditambahkan semuanya data 2026).
const REF_DEFAULT_TAHUN = '2026';
function refTahun_(r) {
  return normTahun_(r[REF_COL.TAHUN]) || REF_DEFAULT_TAHUN;
}

/*** ============ MASTER LIST BULAN ============ ***/
const BULAN_LIST = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember'
];

const BULAN_ALIASES = {
  '1':0,'01':0,'jan':0,'januari':0,
  '2':1,'02':1,'feb':1,'februari':1,
  '3':2,'03':2,'mar':2,'maret':2,
  '4':3,'04':3,'apr':3,'april':3,
  '5':4,'05':4,'mei':4,
  '6':5,'06':5,'jun':5,'juni':5,
  '7':6,'07':6,'jul':6,'juli':6,
  '8':7,'08':7,'agu':7,'aug':7,'agustus':7,
  '9':8,'09':8,'sep':8,'september':8,
  '10':9,'okt':9,'oct':9,'oktober':9,
  '11':10,'nov':10,'november':10,
  '12':11,'des':11,'dec':11,'desember':11
};

/*** ============ HELPER NORMALISASI ============ ***/
function normTahun_(val) {
  if (val === null || val === undefined || val === '') return '';
  const s = String(val).trim().replace(/\D/g, '');
  return s.length ? s : String(val).trim();
}

function normBulan_(val) {
  if (val === null || val === undefined || val === '') return '';
  const s = String(val).trim().toLowerCase();
  const idx = BULAN_ALIASES.hasOwnProperty(s) ? BULAN_ALIASES[s] : null;
  if (idx !== null) return BULAN_LIST[idx];
  const found = BULAN_LIST.find(b => b.toLowerCase() === s);
  return found || String(val).trim();
}

function normTanggal_(val) {
  if (val === null || val === undefined || val === '') return null;
  if (val instanceof Date) {
    if (val.getFullYear() > 1900) {
      const y = val.getFullYear();
      const m = String(val.getMonth() + 1).padStart(2, '0');
      const d = String(val.getDate()).padStart(2, '0');
      return y + '-' + m + '-' + d;
    }
    return null;
  }
  const s = String(val).trim();
  if (/^\d+$/.test(s) && Number(s) > 40000) {
    const date = new Date(new Date(1899, 11, 30).getTime() + Number(s) * 86400000);
    if (date.getFullYear() > 1900) {
      return date.getFullYear() + '-' +
        String(date.getMonth() + 1).padStart(2, '0') + '-' +
        String(date.getDate()).padStart(2, '0');
    }
  }
  let match;
  if ((match = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/))) {
    return match[3] + '-' + match[2].padStart(2,'0') + '-' + match[1].padStart(2,'0');
  }
  if ((match = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/))) {
    return match[1] + '-' + match[2].padStart(2,'0') + '-' + match[3].padStart(2,'0');
  }
  return null;
}

function normText_(val) {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

// Khusus utk kolom DPD (Referensi Akun): kalau isinya ditulis sbg rentang "hari-bulan"
// dan KEDUA angkanya kebetulan valid sbg tanggal & bulan kalender (mis. "1-3" atau
// "4-10"), Google Sheets otomatis mengonversi sel itu jadi tanggal beneran (1-3 → 1
// Maret, 4-10 → 4 Oktober) — cell-nya sendiri sudah berubah jadi Date, bukan lagi
// teks, dan ini terjadi di level spreadsheet, bukan di kode ini. Kalau dibiarkan lewat
// normText_ biasa, Date itu ke-print jadi string panjang "Sun Mar 01 2026 00:00:00
// GMT+0700 (Western Indonesia Time)" yang membingungkan. Di sini kita rekonstruksi
// balik jadi "hari-bulan" (format yg sama seperti yg aslinya diketik SPV), bukan
// tampilkan Date.toString() mentah. Rentang yg salah satu/kedua angkanya BUKAN
// tanggal/bulan valid (mis. "15-30", "91-800", "120+") tidak pernah dikonversi
// Sheets, jadi tetap lewat sbg teks biasa dan tidak terpengaruh fungsi ini.
function normDpdText_(val) {
  if (val === null || val === undefined || val === '') return '';
  if (val instanceof Date) {
    return val.getDate() + '-' + (val.getMonth() + 1);
  }
  return String(val).trim();
}

function normAbsensi_(val) {
  const s = normText_(val).toLowerCase();
  if (['h', 'hadir', 'masuk'].includes(s)) return 'Hadir';
  if (['i', 'izin'].includes(s)) return 'Izin';
  if (['s', 'sakit'].includes(s)) return 'Sakit';
  if (['a', 'alpha', 'alfa'].includes(s)) return 'Alpha';
  if (['o', 'off', 'libur'].includes(s)) return 'Off';
  return normText_(val);
}

function normRupiah_(val) {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  let s = String(val).trim().replace(/rp/gi, '').trim();
  const hasComma = s.includes(',');
  const hasDot = s.includes('.');
  if (hasComma && hasDot) { s = s.replace(/\./g, '').replace(',', '.'); }
  else if (hasComma && !hasDot) { s = s.replace(',', '.'); }
  else { s = s.replace(/\./g, ''); }
  const n = parseFloat(s.replace(/[^\d.\-]/g, ''));
  return isNaN(n) ? 0 : n;
}

function normNumber_(val) {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  let s = String(val).trim().replace(/\./g, '').replace(',', '.');
  s = s.replace(/[^\d.\-]/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function normRate_(val) {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val > 1 ? val / 100 : val;
  let s = String(val).trim();
  const hasPercent = s.includes('%');
  s = s.replace('%', '').replace(',', '.').trim();
  const n = parseFloat(s);
  if (isNaN(n)) return 0;
  if (hasPercent) return n / 100;
  return n > 1 ? n / 100 : n;
}

/*** ============ NORMALIZE ROW ============ ***/
function normalizeRow(row, rowIndex) {
  const errors = [];
  const tanggal = normTanggal_(row[COL.TANGGAL]);
  if (!tanggal) errors.push('TANGGAL tidak valid: "' + row[COL.TANGGAL] + '"');
  return {
    _row: rowIndex,
    tahun: normTahun_(row[COL.TAHUN]),
    bulan: normBulan_(row[COL.BULAN]),
    tanggal: tanggal,
    aplikasi: normText_(row[COL.APLIKASI]),
    bucket: normText_(row[COL.BUCKET]),
    absensi: normAbsensi_(row[COL.ABSENSI]),
    teamLeader: normText_(row[COL.TEAM_LEADER]),
    agent: normText_(row[COL.AGENT]),
    namaAkun: normText_(row[COL.NAMA_AKUN]),
    alatWA: normNumber_(row[COL.ALAT_WA]),
    alatGojek: normNumber_(row[COL.ALAT_GOJEK]),
    totalData: normNumber_(row[COL.TOTAL_DATA]),
    dataBaru: normNumber_(row[COL.DATA_BARU]),
    osDataBaru: normRupiah_(row[COL.OS_DATA_BARU]),
    dailyPayment: normRupiah_(row[COL.DAILY_PAYMENT]),
    jmlDataBayar: normNumber_(row[COL.JML_DATA_BAYAR]),
    rate: normRate_(row[COL.RATE]),
    autocall: normNumber_(row[COL.AUTOCALL]),
    callManual: normNumber_(row[COL.CALL_MANUAL]),
    callTerhubung: normNumber_(row[COL.CALL_TERHUBUNG]),
    sentuhWA: normNumber_(row[COL.SENTUH_WA]),
    sentuhGojek: normNumber_(row[COL.SENTUH_GOJEK]),
    responWA: normNumber_(row[COL.RESPON_WA]),
    responGojek: normNumber_(row[COL.RESPON_GOJEK]),
    waBlokir: normNumber_(row[COL.WA_BLOKIR]),
    ptp: normNumber_(row[COL.PTP]),
    ptpBayar: normNumber_(row[COL.PTP_BAYAR]),
    catatanSPV: normText_(row[COL.CATATAN_SPV]),
    sentuhWABA: normNumber_(row[COL.SENTUH_WABA]),
    responWABA: normNumber_(row[COL.RESPON_WABA]),
    smsManual: normNumber_(row[COL.SMS_MANUAL]),
    responSMSManual: normNumber_(row[COL.RESPON_SMS_MANUAL]),
    paymentOvertime: normRupiah_(row[COL.PAYMENT_OVERTIME]),
    _errors: errors
  };
}

/*** ============ SUPERVISOR LOOKUP ============ ***/
// Map supervisor per tahun: key "aplikasi||bucket||tahun" (lowercase), plus
// key "aplikasi||bucket" sbg fallback kalau tahun tsb belum ada barisnya
// (fallback ambil baris tahun TERBARU, krn diproses urut tahun naik).
function buildSupervisorMap_(refRows) {
  const map = {};
  const sorted = refRows.slice().sort((a, b) => Number(refTahun_(a)) - Number(refTahun_(b)));
  sorted.forEach(r => {
    const supervisor = normText_(r[REF_COL.SUPERVISOR]);
    const aplikasi   = normText_(r[REF_COL.APLIKASI]).toLowerCase();
    const bucket     = normText_(r[REF_COL.BUCKET]).toLowerCase();
    if (!aplikasi || !bucket) return;
    map[aplikasi + '||' + bucket + '||' + refTahun_(r)] = supervisor;
    map[aplikasi + '||' + bucket] = supervisor;
  });
  return map;
}

function lookupSupervisor_(supMap, aplikasi, bucket, tahun) {
  const base = normText_(aplikasi).toLowerCase() + '||' + normText_(bucket).toLowerCase();
  const t = normTahun_(tahun);
  if (t && supMap.hasOwnProperty(base + '||' + t)) return supMap[base + '||' + t];
  return supMap.hasOwnProperty(base) ? supMap[base] : '';
}

/*** ============ APLIKASI & BUCKET DINAMIS ============ ***/
function getAplikasiBucketList_(refRows) {
  const aplikasiSet = {}, bucketSet = {};
  refRows.forEach(r => {
    const ap = normText_(r[REF_COL.APLIKASI]);
    const bk = normText_(r[REF_COL.BUCKET]);
    if (ap) aplikasiSet[ap] = true;
    if (bk) bucketSet[bk] = true;
  });
  return {
    aplikasiList: Object.keys(aplikasiSet).sort(),
    bucketList: Object.keys(bucketSet).sort()
  };
}

/*** ============ READ INPUT DATA ============ ***/
function readInputData() {
  const ss = SpreadsheetApp.openById(CFG.SPREADSHEET_ID);
  const sheetAllData = ss.getSheetByName(CFG.SHEET_ALL_DATA);
  const sheetRef     = ss.getSheetByName(CFG.SHEET_REFERENSI);
  if (!sheetAllData) throw new Error('Sheet "' + CFG.SHEET_ALL_DATA + '" tidak ditemukan.');
  if (!sheetRef)     throw new Error('Sheet "' + CFG.SHEET_REFERENSI + '" tidak ditemukan.');

  const lastRowData = sheetAllData.getLastRow();
  const lastRowRef  = sheetRef.getLastRow();

  if (lastRowData < CFG.DATA_START_ROW) {
    return { rows: [], errors: [], aplikasiList: [], bucketList: [] };
  }

  const range = sheetAllData.getRange(
    CFG.DATA_START_ROW, 1,
    lastRowData - CFG.DATA_START_ROW + 1,
    TOTAL_COLS
  );
  const rawRows    = range.getValues();
  const displayRows = range.getDisplayValues();

  const refRows = lastRowRef >= 2
    ? sheetRef.getRange(2, 1, lastRowRef - 1, REF_TOTAL_COLS).getValues()
    : [];

  const supMap = buildSupervisorMap_(refRows);
  const { aplikasiList, bucketList } = getAplikasiBucketList_(refRows);

  const errors = [], rows = [];
  rawRows.forEach((raw, i) => {
    const isEmpty = raw.every(c => c === '' || c === null || c === undefined);
    if (isEmpty) return;
    raw[COL.TANGGAL] = displayRows[i][COL.TANGGAL];
    const rowIndex = CFG.DATA_START_ROW + i;
    const norm = normalizeRow(raw, rowIndex);
    if (norm._errors.length > 0) errors.push({ row: rowIndex, issues: norm._errors });
    norm.supervisor = lookupSupervisor_(supMap, norm.aplikasi, norm.bucket, norm.tahun);
    rows.push(norm);
  });

  return { rows, errors, aplikasiList, bucketList };
}

/*** ============ SUMMARIZE ============ ***/
function summarizeRows_(rows) {
  if (rows.length === 0) {
    return {
      totalRecord:0, totalData:0, dataBaru:0, osDataBaru:0,
      dailyPayment:0, jmlDataBayar:0, avgRate:0, paymentOvertime:0,
      autocall:0, callManual:0, callTerhubung:0,
      sentuhWA:0, sentuhGojek:0, responWA:0, responGojek:0,
      waBlokir:0, ptp:0, ptpBayar:0,
      sentuhWABA:0, responWABA:0, smsManual:0, responSMSManual:0
    };
  }
  const sum = (key) => rows.reduce((acc, r) => acc + (r[key] || 0), 0);
  const totalBayar = sum('jmlDataBayar');
  const weightedRate = totalBayar > 0
    ? rows.reduce((acc, r) => acc + (r.rate * r.jmlDataBayar), 0) / totalBayar
    : rows.reduce((acc, r) => acc + r.rate, 0) / rows.length;
  return {
    totalRecord: rows.length,
    totalData: sum('totalData'),
    dataBaru: sum('dataBaru'),
    osDataBaru: sum('osDataBaru'),
    dailyPayment: sum('dailyPayment'),
    jmlDataBayar: sum('jmlDataBayar'),
    avgRate: Math.round(weightedRate * 10000) / 10000,
    paymentOvertime: sum('paymentOvertime'),
    autocall: sum('autocall'),
    callManual: sum('callManual'),
    callTerhubung: sum('callTerhubung'),
    sentuhWA: sum('sentuhWA'),
    sentuhGojek: sum('sentuhGojek'),
    responWA: sum('responWA'),
    responGojek: sum('responGojek'),
    waBlokir: sum('waBlokir'),
    ptp: sum('ptp'),
    ptpBayar: sum('ptpBayar'),
    sentuhWABA: sum('sentuhWABA'),
    responWABA: sum('responWABA'),
    smsManual: sum('smsManual'),
    responSMSManual: sum('responSMSManual')
  };
}

/*** ============ ENDPOINTS ============ ***/
/* ============================================================
 * SERVER-SIDE CACHE HELPER (CacheService — max 6 jam / 21600 dtk)
 * Mengurangi cold-start Apps Script ~70% untuk data yang sama
 * ============================================================ */
const SVC_CACHE_TTL = 300; // 5 menit (detik)

function _cacheGet(key) {
  try { const v = CacheService.getScriptCache().get(key); return v ? JSON.parse(v) : null; } catch(e) { return null; }
}
function _cachePut(key, obj) {
  try {
    const s = JSON.stringify(obj);
    // CacheService max value 100KB — skip kalau terlalu besar
    if (s.length < 90000) CacheService.getScriptCache().put(key, s, SVC_CACHE_TTL);
  } catch(e) {}
}
function _cacheRemove(key) {
  try { CacheService.getScriptCache().remove(key); } catch(e) {}
}

/** Panggil dari trigger / manual setelah update sheet agar cache segar */
function clearAllServerCache() {
  const keys = ['svc_referensi', 'svc_violation', 'svc_agentdata_raw', 'svc_rankdata', 'svc_paytrend'];
  keys.forEach(k => _cacheRemove(k));
  Logger.log('Server cache cleared: ' + keys.join(', '));
}

function doGet(e) {
  try {
    const action = (e.parameter.action || 'home').toLowerCase();
    let result;
    switch (action) {
      case 'home':      result = endpointHome_(e);      break;
      case 'agentdata': result = endpointAgentData_(e); break;
      case 'weekly':    result = endpointWeekly_(e);    break;
      case 'referensi': result = endpointReferensi_(e); break;
      case 'violation': result = endpointViolation_(e); break;
      case 'jumlahakun': result = endpointJumlahAkun_(e); break;
      case 'rankdata':  result = endpointRankData_(e);  break;
      case 'paymenttrend': result = endpointPaymentTrend_(e); break;
      case 'klien':     result = endpointKlien_(e);     break;
      case 'databayar': result = endpointDataBayar_(e); break;
      case 'pinj':      result = endpointPinj_(e);      break;
      case 'jam':       result = endpointJam_(e);       break;
      case 'pinjd':     result = endpointPinjD_(e);     break;
      case 'qccheck':   result = endpointQcCheck_(e);   break;
      case 'kelengkapan': result = endpointKelengkapan_(e); break;
      default: result = { success: false, message: 'Unknown action: ' + action };
    }
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false, message: err.message, stack: err.stack
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function endpointHome_(e) {
  const { rows, errors, aplikasiList, bucketList } = readInputData();
  return {
    success: true, action: 'home',
    totalRows: rows.length,
    totalErrors: errors.length,
    errors: errors.slice(0, 20),
    aplikasiList, bucketList,
    sample: rows.slice(0, 3)
  };
}

function endpointAgentData_(e) {
  const p = e.parameter;
  // Cache raw rows (tanpa filter) — key tidak include parameter filter
  const CACHE_KEY = 'svc_agentdata_raw';
  let allRows = _cacheGet(CACHE_KEY);
  if (!allRows) {
    const { rows } = readInputData();
    allRows = rows;
    _cachePut(CACHE_KEY, allRows);
  }
  let filtered = allRows;
  if (p.agent)    filtered = filtered.filter(r => r.agent.toLowerCase() === p.agent.trim().toLowerCase());
  if (p.bulan)    filtered = filtered.filter(r => r.bulan === normBulan_(p.bulan));
  if (p.tahun)    filtered = filtered.filter(r => r.tahun === normTahun_(p.tahun));
  if (p.aplikasi) filtered = filtered.filter(r => r.aplikasi.toLowerCase() === p.aplikasi.trim().toLowerCase());
  if (p.bucket)   filtered = filtered.filter(r => r.bucket.toLowerCase() === p.bucket.trim().toLowerCase());
  // Strip internal fields untuk kurangi response size
  const cleanRows = filtered.map(r => {
    const {_errors, _row, ...rest} = r;
    return rest;
  });
  return {
    success: true, action: 'agentdata', filters: p,
    totalRows: cleanRows.length,
    summary: summarizeRows_(cleanRows),
    rows: cleanRows
  };
}

function endpointWeekly_(e) {
  const p = e.parameter;
  const { rows } = readInputData();
  let filtered = rows.filter(r => r.tanggal !== null);
  if (p.bulan)    filtered = filtered.filter(r => r.bulan === normBulan_(p.bulan));
  if (p.tahun)    filtered = filtered.filter(r => r.tahun === normTahun_(p.tahun));
  if (p.aplikasi) filtered = filtered.filter(r => r.aplikasi.toLowerCase() === p.aplikasi.trim().toLowerCase());
  if (p.bucket)   filtered = filtered.filter(r => r.bucket.toLowerCase() === p.bucket.trim().toLowerCase());
  const weeks = {};
  filtered.forEach(r => {
    const day = parseInt(r.tanggal.split('-')[2]);
    const wKey = 'Minggu ' + Math.ceil(day / 7);
    if (!weeks[wKey]) weeks[wKey] = [];
    weeks[wKey].push(r);
  });
  const result = {};
  Object.keys(weeks).sort().forEach(wKey => {
    result[wKey] = summarizeRows_(weeks[wKey]);
  });
  return {
    success: true, action: 'weekly', filters: p,
    totalRows: filtered.length,
    weekly: result
  };
}

function endpointReferensi_(e) {
  const p = (e && e.parameter) || {};
  const all = referensiAll_();
  if (!p.tahun) return all;
  const t = normTahun_(p.tahun);
  return Object.assign({}, all, { filters: p, rows: all.rows.filter(r => r.tahun === t) });
}

// Semua baris Referensi Akun (semua tahun) — di-cache.
function referensiAll_() {
  const CACHE_KEY = 'svc_referensi';
  const hit = _cacheGet(CACHE_KEY);
  if (hit) return hit;

  const ss = SpreadsheetApp.openById(CFG.SPREADSHEET_ID);
  const sheetRef = ss.getSheetByName(CFG.SHEET_REFERENSI);
  if (!sheetRef) throw new Error('Sheet Referensi Akun tidak ditemukan.');
  const lastRow = sheetRef.getLastRow();
  if (lastRow < 2) return { success: true, action: 'referensi', rows: [], aplikasiList: [], bucketList: [], tahunList: [] };
  const rawRows = sheetRef.getRange(2, 1, lastRow - 1, REF_TOTAL_COLS).getValues();
  const rows = rawRows.map(r => ({
    supervisor: normText_(r[REF_COL.SUPERVISOR]),
    aplikasi:   normText_(r[REF_COL.APLIKASI]),
    bucket:     normText_(r[REF_COL.BUCKET]),
    tahun:      refTahun_(r),
    dpd:        normDpdText_(r[REF_COL.DPD]), // range DPD/keterlambatan, mis. "1-30" — normDpdText_ (bukan normText_) krn Sheets kadang auto-convert nilai spt "1-3"/"4-10" jadi Date
    januari:   normNumber_(r[REF_COL.JAN + 0]),
    februari:  normNumber_(r[REF_COL.JAN + 1]),
    maret:     normNumber_(r[REF_COL.JAN + 2]),
    april:     normNumber_(r[REF_COL.JAN + 3]),
    mei:       normNumber_(r[REF_COL.JAN + 4]),
    juni:      normNumber_(r[REF_COL.JAN + 5]),
    juli:      normNumber_(r[REF_COL.JAN + 6]),
    agustus:   normNumber_(r[REF_COL.JAN + 7]),
    september: normNumber_(r[REF_COL.JAN + 8]),
    oktober:   normNumber_(r[REF_COL.JAN + 9]),
    november:  normNumber_(r[REF_COL.JAN + 10]),
    desember:  normNumber_(r[REF_COL.JAN + 11]),
  })).filter(r => r.aplikasi || r.bucket);
  const aplikasiSet = {}, bucketSet = {}, tahunSet = {};
  rows.forEach(r => {
    if (r.aplikasi) aplikasiSet[r.aplikasi] = true;
    if (r.bucket)   bucketSet[r.bucket]     = true;
    if (r.tahun)    tahunSet[r.tahun]       = true;
  });
  const result = {
    success: true, action: 'referensi',
    rows,
    aplikasiList: Object.keys(aplikasiSet).sort(),
    bucketList:   Object.keys(bucketSet).sort(),
    tahunList:    Object.keys(tahunSet).sort()
  };
  _cachePut(CACHE_KEY, result);
  return result;
}

/*** ============ PAYMENT TREND (grafik Payment di index.html) ============ ***
 * Ringkasan kecil payment per tahun → aplikasi → bulan, supaya grafik tren
 * Payment tidak perlu menarik data mentah agentdata (±4 MB) untuk tiap bulan.
 * Output: { tahunList:[...], trend:{ aplikasi:{ Januari:{dailyPayment,
 *          paymentOvertime, jmlDataBayar}, ... } } }  (trend = tahun diminta)
 *************************************************************************/
function endpointPaymentTrend_(e) {
  const p = (e && e.parameter) || {};
  const CACHE_KEY = 'svc_paytrend';
  let agg = _cacheGet(CACHE_KEY);
  if (!agg) {
    let rows = _cacheGet('svc_agentdata_raw');
    if (!rows) rows = readInputData().rows;
    const byYear = {};
    rows.forEach(r => {
      const t = r.tahun, b = r.bulan, ap = r.aplikasi || 'LAINNYA';
      if (!t || BULAN_LIST.indexOf(b) < 0) return;
      const y = byYear[t] || (byYear[t] = {});
      const a = y[ap] || (y[ap] = {});
      const m = a[b] || (a[b] = { dailyPayment: 0, paymentOvertime: 0, jmlDataBayar: 0 });
      m.dailyPayment    += r.dailyPayment || 0;
      m.paymentOvertime += r.paymentOvertime || 0;
      m.jmlDataBayar    += r.jmlDataBayar || 0;
    });
    agg = { tahunList: Object.keys(byYear).filter(t => /^\d{4}$/.test(t)).sort(), byYear: byYear };
    _cachePut(CACHE_KEY, agg);
  }
  const tahun = normTahun_(p.tahun || '');
  return {
    success: true, action: 'paymenttrend', tahun: tahun,
    tahunList: agg.tahunList,
    trend: tahun ? (agg.byYear[tahun] || {}) : agg.byYear
  };
}

function TEST_paymenttrend() {
  Logger.log(JSON.stringify(endpointPaymentTrend_({parameter:{tahun:'2026'}}), null, 2));
}

/*** ============ VIOLATION ENDPOINT ============ ***/
function normalizeViolationRow_(row, idx) {
  const tglMasuk  = normTanggal_(row[VCOL.TGL_MASUK]);
  const tglKeluar = normTanggal_(row[VCOL.TGL_KELUAR]);

  // Hitung durasi (hari) dari tanggal masuk & keluar
  let durasiHari = 0;
  const rawDurasi = row[VCOL.DURASI];
  if (rawDurasi !== null && rawDurasi !== undefined && rawDurasi !== '') {
    // Jika sudah ada nilai di kolom D, pakai langsung
    const n = parseFloat(String(rawDurasi).replace(/[^0-9.]/g, ''));
    if (!isNaN(n)) durasiHari = Math.round(n);
  }
  if (durasiHari === 0 && tglMasuk && tglKeluar) {
    const diffMs = new Date(tglKeluar) - new Date(tglMasuk);
    if (!isNaN(diffMs) && diffMs >= 0) durasiHari = Math.round(diffMs / 86400000);
  }

  // Ekstrak bulan & tahun dari tanggal masuk
  let bulanMasuk = '', tahunMasuk = '';
  if (tglMasuk) {
    const parts = tglMasuk.split('-');
    if (parts.length === 3) {
      tahunMasuk = parts[0];
      const mIdx = parseInt(parts[1], 10) - 1;
      bulanMasuk = BULAN_LIST[mIdx] || '';
    }
  }

  return {
    _idx: idx,
    no:                normText_(row[VCOL.NO]),
    tanggalMasuk:      tglMasuk || normText_(row[VCOL.TGL_MASUK]),
    tanggalKeluar:     tglKeluar || normText_(row[VCOL.TGL_KELUAR]),
    durasiHari:        durasiHari,
    bulanMasuk:        bulanMasuk,
    tahunMasuk:        tahunMasuk,
    namaAgen:          normText_(row[VCOL.NAMA_AGEN]),
    aplikasi:          normText_(row[VCOL.APLIKASI]),
    bucket:            normText_(row[VCOL.BUCKET]),
    leader:            normText_(row[VCOL.LEADER]),
    akun:              normText_(row[VCOL.AKUN]),
    namaBorrower:      normText_(row[VCOL.NAMA_BORROWER]),
    kanalPengaduan:    normText_(row[VCOL.KANAL]).toUpperCase(),
    kasus:             normText_(row[VCOL.KASUS]),
    namaQC:            normText_(row[VCOL.NAMA_QC]),
    statusEksternal:   normText_(row[VCOL.STATUS_EXT]).toUpperCase(),
    punishmentEksternal: normText_(row[VCOL.PUNISHMENT_EXT]),
    statusInternal:    normText_(row[VCOL.STATUS_INT]).toUpperCase(),
    punishmentInternal: normText_(row[VCOL.PUNISHMENT_INT]),
    buktiLaporan:      normText_(row[VCOL.BUKTI_LAPORAN]),
    riwayatHandleCase: normText_(row[VCOL.RIWAYAT]),
    tanggalKomplain:   normTanggal_(row[VCOL.TGL_KOMPLAIN]) || normText_(row[VCOL.TGL_KOMPLAIN]),
    buktiFeedback:     normText_(row[VCOL.FILE_FEEDBACK]),
    denda:             normText_(row[VCOL.DENDA]),
    keteranganTambahan: normText_(row[VCOL.KET_TAMBAHAN]),
    buktiLaporanMandarin: normText_(row[VCOL.BUKTI_LAPORAN_CN]),
    buktiFeedbackMandarin: normText_(row[VCOL.FILE_FEEDBACK_CN]),
    statusValidasi:    normText_(row[VCOL.STATUS_VALIDASI]),
    keteranganAlvin:   normText_(row[VCOL.KET_ALVIN])
  };
}

function endpointViolation_(e) {
  const p = e ? (e.parameter || {}) : {};
  const CACHE_KEY = 'svc_violation';

  // Ambil semua baris dari cache dulu (filter tetap di sini)
  let rows = _cacheGet(CACHE_KEY);

  if (!rows) {
    const ss = SpreadsheetApp.openById(CFG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CFG.SHEET_VIOLATION);
    if (!sheet) throw new Error('Sheet "' + CFG.SHEET_VIOLATION + '" tidak ditemukan.');
    const lastRow = sheet.getLastRow();
    if (lastRow < CFG.DATA_START_ROW) {
      return { success: true, action: 'violation', totalRows: 0, rows: [] };
    }
    const rawRows = sheet.getRange(
      CFG.DATA_START_ROW, 1,
      lastRow - CFG.DATA_START_ROW + 1,
      VTOTAL_COLS
    ).getValues();
    rows = [];
    rawRows.forEach((raw, i) => {
      const isEmpty = raw.every(c => c === '' || c === null || c === undefined);
      if (isEmpty) return;
      rows.push(normalizeViolationRow_(raw, rows.length));
    });
    _cachePut(CACHE_KEY, rows);
  }

  // Apply filters if provided
  let filtered = rows;
  if (p.bulan)    filtered = filtered.filter(r => r.bulanMasuk === normBulan_(p.bulan));
  if (p.tahun)    filtered = filtered.filter(r => r.tahunMasuk === normTahun_(p.tahun));
  if (p.aplikasi) filtered = filtered.filter(r => r.aplikasi.toLowerCase() === p.aplikasi.trim().toLowerCase());
  if (p.kanal)    filtered = filtered.filter(r => r.kanalPengaduan === p.kanal.trim().toUpperCase());

  return {
    success: true,
    action: 'violation',
    totalRows: filtered.length,
    rows: filtered
  };
}

/*** ============ TEST FUNCTIONS ============ ***/
function TEST_home() {
  Logger.log(JSON.stringify(endpointHome_({parameter:{}}), null, 2));
}
function TEST_agentdata() {
  Logger.log(JSON.stringify(endpointAgentData_({parameter:{bulan:'Juli', tahun:'2026'}}), null, 2));
}
function TEST_weekly() {
  Logger.log(JSON.stringify(endpointWeekly_({parameter:{bulan:'Juli', tahun:'2026'}}), null, 2));
}
function TEST_referensi() {
  Logger.log(JSON.stringify(endpointReferensi_({parameter:{}}), null, 2));
}
function TEST_referensi2027() {
  Logger.log(JSON.stringify(endpointReferensi_({parameter:{tahun:'2027'}}), null, 2));
}
function TEST_violation() {
  Logger.log(JSON.stringify(endpointViolation_({parameter:{}}), null, 2));
}

// ── Endpoint: Jumlah Akun per Aplikasi per Bulan ──────────────
function endpointJumlahAkun_(e) {
  const SHEET_NAME = 'DAFTAR APLIKASI & JUMLAH AGENT';
  try {
    const ss    = SpreadsheetApp.openById(CFG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) return {success:false, message:'Sheet tidak ditemukan: '+SHEET_NAME};

    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    if (lastRow < 3 || lastCol < 2) return {success:true, data:[]};

    // Row 2 = header tanggal (B2, C2, ...)
    const headerRow = sheet.getRange(2, 1, 1, lastCol).getValues()[0];
    // Row 3 dst = data aplikasi
    const dataRows  = sheet.getRange(3, 1, lastRow - 2, lastCol).getValues();

    // Parse header tanggal → {colIdx, bulan, tahun}
    // Format tanggal di sheet: Date object atau string "1/1/2025" = bulan/hari/tahun atau hari/bulan/tahun
    const BULAN_NAMES = ['Januari','Februari','Maret','April','Mei','Juni',
                         'Juli','Agustus','September','Oktober','November','Desember'];
    const headers = [];
    for (let c = 1; c < headerRow.length; c++) {
      const val = headerRow[c];
      if (!val) continue;
      let month, year;
      if (val instanceof Date) {
        month = val.getMonth() + 1; // 1-12
        year  = val.getFullYear();
      } else {
        // String "1/1/2025" = hari/bulan/tahun (Indonesia)
        const parts = String(val).split('/');
        if (parts.length >= 3) {
          month = parseInt(parts[1]);
          year  = parseInt(parts[2]);
        } else continue;
      }
      if (!month || !year) continue;
      headers.push({col: c, bulan: BULAN_NAMES[month-1], tahun: String(year), month, year});
    }

    // Build data: [{aplikasi, bulan, tahun, jumlahAkun}]
    const result = [];
    dataRows.forEach(row => {
      const aplikasi = String(row[0]||'').trim();
      if (!aplikasi) return;
      headers.forEach(h => {
        const val = row[h.col];
        const jumlah = parseInt(val) || 0;
        if (jumlah > 0) {
          result.push({
            aplikasi,
            bulan: h.bulan,
            tahun: h.tahun,
            jumlahAkun: jumlah
          });
        }
      });
    });

    return {success: true, data: result};
  } catch(err) {
    return {success: false, message: err.message};
  }
}

function TEST_jumlahakun() {
  Logger.log(JSON.stringify(endpointJumlahAkun_({parameter:{}}), null, 2));
}

/*** ============ RANK DATA (Sheet "DATA RANK") ============ ***
 * Sheet berisi 2 blok tabel berdampingan di sheet yang sama:
 *   - RANK DAILY   : kolom A–I  (TANGGAL, NAMA APLIKASI, BUCKET, VENDOR, OS, PAYMENT, RATE, RANK, GAP)
 *   - kolom J       : pemisah kosong
 *   - RANK MONTHLY : kolom K–S  (TANGGAL, NAMA APLIKASI, BUCKET, VENDOR, OS, PAYMENT, RATE, RANK, GAP)
 * Row 1 = judul blok (merged), row 2 = header kolom, data mulai row 3.
 * VENDOR = entitas yang di-ranking di dalam 1 bucket (mis. EDN, TEAM B, TEAM C...,
 * atau S1-3 Old EDN, HRO-MKM-A, dst tergantung aplikasi) — dipakai utk chart
 * multi-line/bar perbandingan antar vendor dari waktu ke waktu di team.html.
 *************************************************************/
const RANKCOL = {
  // Blok DAILY (0-based, relatif ke awal baris yang dibaca mulai kolom A)
  D_TANGGAL:0, D_APLIKASI:1, D_BUCKET:2, D_VENDOR:3, D_OS:4, D_PAYMENT:5, D_RATE:6, D_RANK:7, D_GAP:8,
  // Blok MONTHLY — kolom K adalah index 10 (A=0 ... J=9, K=10)
  M_TANGGAL:10, M_APLIKASI:11, M_BUCKET:12, M_VENDOR:13, M_OS:14, M_PAYMENT:15, M_RATE:16, M_RANK:17, M_GAP:18
};
const RANK_TOTAL_COLS = 19; // A sampai S

// Konversi khusus serial tanggal utk sheet "DATA RANK" — SENGAJA TIDAK memakai
// normTanggal_() yang dipakai sheet "All Data", karena normTanggal_() membangun
// epoch pakai `new Date(1899,11,30)` (LOCAL time, ikut timezone project Apps
// Script). Itu terbukti menghasilkan tanggal MUNDUR 1 HARI kalau timezone project-
// nya di zona GMT+ (mis. Asia/Jakarta) — sudah dites: serial 46235 salah jadi
// 2026-07-31, padahal seharusnya 2026-08-01. Di sini pakai Date.UTC() murni supaya
// hasilnya selalu benar apa pun timezone project-nya. Kolom TANGGAL "All Data"
// tidak disentuh sama sekali (biar tidak berisiko me-regresi pipeline yang sudah
// berjalan baik — di sana sepertinya kolomnya sudah ke-format Date, bukan serial
// mentah, jadi tidak pernah lewat cabang ini).
function _rankSerialToDate_(serial) {
  const epochUTC = Date.UTC(1899, 11, 30);
  const dateUTC = new Date(epochUTC + Number(serial) * 86400000);
  if (dateUTC.getUTCFullYear() > 1900) {
    return dateUTC.getUTCFullYear() + '-' +
      String(dateUTC.getUTCMonth() + 1).padStart(2, '0') + '-' +
      String(dateUTC.getUTCDate()).padStart(2, '0');
  }
  return null;
}

function _rankNormTanggal_(val) {
  if (val === null || val === undefined || val === '') return '';
  if (val instanceof Date) {
    if (val.getFullYear() > 1900) {
      const y = val.getFullYear();
      const m = String(val.getMonth() + 1).padStart(2, '0');
      const d = String(val.getDate()).padStart(2, '0');
      return y + '-' + m + '-' + d;
    }
    return '';
  }
  const s = String(val).trim();
  if (/^\d+$/.test(s) && Number(s) > 40000) {
    return _rankSerialToDate_(s) || s;
  }
  return s; // fallback teks apa adanya (mis. placeholder blok monthly yg blm diisi tanggal)
}

function _normRankRow_(row, tglIdx, apIdx, bkIdx, vdIdx, osIdx, payIdx, rateIdx, rankIdx, gapIdx) {
  return {
    tanggal: _rankNormTanggal_(row[tglIdx]),
    aplikasi: normText_(row[apIdx]),
    bucket: normText_(row[bkIdx]),
    vendor: normText_(row[vdIdx]),
    os: normRupiah_(row[osIdx]),
    payment: normRupiah_(row[payIdx]),
    rate: normRate_(row[rateIdx]),
    rank: normNumber_(row[rankIdx]),
    gap: normNumber_(row[gapIdx])
  };
}

function endpointRankData_(e) {
  const CACHE_KEY = 'svc_rankdata';
  const hit = _cacheGet(CACHE_KEY);
  if (hit) return hit;

  const ss = SpreadsheetApp.openById(CFG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CFG.SHEET_RANK);
  if (!sheet) return { success: false, message: 'Sheet "' + CFG.SHEET_RANK + '" tidak ditemukan.' };

  const lastRow = sheet.getLastRow();
  const lastCol = Math.max(sheet.getLastColumn(), RANK_TOTAL_COLS);
  if (lastRow < CFG.RANK_DATA_START_ROW) {
    const empty = { success: true, action: 'rankdata', totalDaily: 0, totalMonthly: 0, daily: [], monthly: [] };
    _cachePut(CACHE_KEY, empty);
    return empty;
  }

  const raw = sheet.getRange(
    CFG.RANK_DATA_START_ROW, 1,
    lastRow - CFG.RANK_DATA_START_ROW + 1,
    lastCol
  ).getValues();

  const daily = [], monthly = [];
  raw.forEach(row => {
    // Baris dianggap valid kalau VENDOR terisi (bukan cuma TANGGAL, karena blok
    // monthly bisa saja belum diisi tanggalnya tapi datanya sudah valid).
    if (normText_(row[RANKCOL.D_VENDOR])) {
      daily.push(_normRankRow_(row, RANKCOL.D_TANGGAL, RANKCOL.D_APLIKASI, RANKCOL.D_BUCKET,
        RANKCOL.D_VENDOR, RANKCOL.D_OS, RANKCOL.D_PAYMENT, RANKCOL.D_RATE, RANKCOL.D_RANK, RANKCOL.D_GAP));
    }
    if (normText_(row[RANKCOL.M_VENDOR])) {
      monthly.push(_normRankRow_(row, RANKCOL.M_TANGGAL, RANKCOL.M_APLIKASI, RANKCOL.M_BUCKET,
        RANKCOL.M_VENDOR, RANKCOL.M_OS, RANKCOL.M_PAYMENT, RANKCOL.M_RATE, RANKCOL.M_RANK, RANKCOL.M_GAP));
    }
  });

  const result = {
    success: true, action: 'rankdata',
    totalDaily: daily.length, totalMonthly: monthly.length,
    daily, monthly
  };
  _cachePut(CACHE_KEY, result);
  return result;
}

function TEST_rankdata() {
  Logger.log(JSON.stringify(endpointRankData_({parameter:{}}), null, 2));
}

/*** ============ LAPORAN KLIEN (upload gambar laporan klien) ============ ***
 * Laporan harian/bulanan dari klien (dikirim sbg gambar di grup) dibaca di
 * klien.html memakai Gemini, lalu disimpan ke 3 sheet berikut (dibuat otomatis
 * kalau belum ada):
 *   KLIEN_AGENT  : 1 baris per agent per laporan (DAILY = per tanggal,
 *                  MONTHLY = snapshot akumulasi per tanggal laporan; tiap tanggal disimpan)
 *   KLIEN_TL     : ranking TL lintas vendor (tabel atas di gambar)
 *   KLIEN_VENDOR : repay rate harian per vendor (kotak kanan di laporan Monthly)
 * Upload ulang laporan yg sama (jenis+tanggal/periode+bucket) MENGGANTI data
 * lama, tidak dobel.
 ***********************************************************************/
const KLIEN_SHEETS = {
  AGENT:  { name: 'KLIEN_AGENT',  head: ['JENIS','TANGGAL','PERIODE','BUCKET','KUFI_ID','NAMA','TL','COMPANY','OUTSTANDING','REPAY','RATE_PCT','HANDLE_TIME','LOAD','MERAH','DIUPLOAD'], textCols: 8 },
  TL:     { name: 'KLIEN_TL',     head: ['JENIS','TANGGAL','PERIODE','BUCKET','RANK','TL','COMPANY','OUTSTANDING','REPAY','RATE_PCT','AHT','DIUPLOAD'], textCols: 4 },
  VENDOR: { name: 'KLIEN_VENDOR', head: ['TANGGAL','PERIODE','BUCKET','COMPANY','RATE_PCT','DIUPLOAD'], textCols: 4 },
  // Ringkasan per kategori tiket (COMPANY × M1-1/M1-2/M1-3/M30+), semua vendor
  KATEGORI: { name: 'KLIEN_KATEGORI', head: ['TANGGAL','PERIODE','COMPANY','KATEGORI','OUTSTANDING','REPAY','RATE_PCT','DIUPLOAD'], textCols: 4 }
};

function _klienSheet_(ss, def) {
  let sh = ss.getSheetByName(def.name);
  if (!sh) {
    sh = ss.insertSheet(def.name);
    sh.getRange(1, 1, 1, def.head.length).setValues([def.head]).setFontWeight('bold');
    sh.setFrozenRows(1);
    // Kolom teks (tanggal/periode/ID) dipaksa format teks supaya tidak
    // dikonversi otomatis jadi Date oleh Google Sheets.
    sh.getRange(1, 1, sh.getMaxRows(), def.textCols).setNumberFormat('@');
  }
  return sh;
}

function _klienReadAll_(sh, width) {
  const last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, width).getValues();
}

function _klienTxt_(v) {
  if (v instanceof Date) {
    return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return v === null || v === undefined ? '' : String(v).trim();
}

// Ganti baris yg cocok `isOld` dengan `newRows` (tulis ulang seluruh isi sheet)
function _klienReplace_(sh, def, isOld, newRows) {
  const width = def.head.length;
  const keep = _klienReadAll_(sh, width).filter(r => !isOld(r));
  const all = keep.concat(newRows);
  const last = sh.getLastRow();
  if (last >= 2) sh.getRange(2, 1, last - 1, width).clearContent();
  if (all.length) {
    sh.getRange(2, 1, all.length, def.textCols).setNumberFormat('@');
    sh.getRange(2, 1, all.length, width).setValues(all);
  }
  return { kept: keep.length, added: newRows.length };
}

function _klienBucket_(b) {
  const s = String(b || '').toUpperCase().replace(/\s+/g, '');
  if (s === 'CO3' || s === 'C03' || s === 'C0З') return 'C03';
  return s;
}

function klienSave_(body) {
  const jenis = String(body.jenis || '').toUpperCase() === 'MONTHLY' ? 'MONTHLY' : 'DAILY';
  const bucket = _klienBucket_(body.bucket);
  const tanggal = String(body.tanggal || '').slice(0, 10);
  if (!bucket) throw new Error('Bucket kosong.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) throw new Error('Tanggal laporan tidak valid: ' + tanggal);
  const periode = tanggal.slice(0, 7);
  const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
  const num = v => { const n = Number(v); return isNaN(n) ? 0 : n; };

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const ss = SpreadsheetApp.openById(CFG.SPREADSHEET_ID);
    const res = {};
    // Daily & Monthly diganti per (jenis,tanggal,bucket). Monthly disimpan per tanggal
    // laporan (snapshot akumulasi s/d tanggal itu) supaya bisa dilihat mundur via kalender.
    const isOldOf = r => _klienTxt_(r[0]) === jenis && _klienTxt_(r[3]) === bucket &&
      _klienTxt_(r[1]) === tanggal;

    const agents = (body.agents || []).map(a => [jenis, tanggal, periode, bucket,
      String(a.kufiId || ''), String(a.nama || ''), String(a.tl || ''), String(a.company || ''),
      num(a.outstanding), num(a.repay), num(a.rate), num(a.handleTime), num(a.load), a.merah ? 1 : 0, now]);
    const shA = _klienSheet_(ss, KLIEN_SHEETS.AGENT);
    res.agent = _klienReplace_(shA, KLIEN_SHEETS.AGENT, isOldOf, agents);

    const tls = (body.tl || []).map(t => [jenis, tanggal, periode, bucket,
      num(t.rank), String(t.tl || ''), String(t.company || ''),
      num(t.outstanding), num(t.repay), num(t.rate), num(t.aht), now]);
    const shT = _klienSheet_(ss, KLIEN_SHEETS.TL);
    res.tl = _klienReplace_(shT, KLIEN_SHEETS.TL, isOldOf, tls);

    const vend = (body.vendor || []).filter(v => /^\d{4}-\d{2}-\d{2}$/.test(String(v.tanggal || '')));
    if (vend.length) {
      const keys = {};
      vend.forEach(v => { keys[String(v.tanggal) + '|' + String(v.company).toUpperCase()] = true; });
      const shV = _klienSheet_(ss, KLIEN_SHEETS.VENDOR);
      res.vendor = _klienReplace_(shV, KLIEN_SHEETS.VENDOR,
        r => _klienTxt_(r[2]) === bucket && keys[_klienTxt_(r[0]) + '|' + _klienTxt_(r[3]).toUpperCase()],
        vend.map(v => [String(v.tanggal), String(v.tanggal).slice(0, 7), bucket,
          String(v.company || '').toUpperCase(), num(v.rate), now]));
    }
    return { success: true, action: 'klien_save', jenis, bucket, tanggal, result: res };
  } finally {
    lock.releaseLock();
  }
}

// POST {action:'klien_kategori_save', rows:[{tanggal,company,kategori,outstanding,repay,rate}]}
// Upload ulang tanggal yang sama MENGGANTI data tanggal itu.
function klienKategoriSave_(body) {
  const num = v => { const n = Number(v); return isNaN(n) ? 0 : n; };
  const rows = (body.rows || []).filter(r => /^\d{4}-\d{2}-\d{2}$/.test(String(r.tanggal || '')) && r.company && r.kategori);
  if (!rows.length) throw new Error('Tidak ada baris kategori yang valid.');
  const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
  const dates = {};
  rows.forEach(r => { dates[String(r.tanggal).slice(0, 10)] = true; });
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const ss = SpreadsheetApp.openById(CFG.SPREADSHEET_ID);
    const sh = _klienSheet_(ss, KLIEN_SHEETS.KATEGORI);
    const res = _klienReplace_(sh, KLIEN_SHEETS.KATEGORI, r => !!dates[_klienTxt_(r[0])],
      rows.map(r => [String(r.tanggal).slice(0, 10), String(r.tanggal).slice(0, 7), String(r.company).toUpperCase().trim(),
        String(r.kategori).toUpperCase().trim(), num(r.outstanding), num(r.repay), num(r.rate), now]));
    return { success: true, action: 'klien_kategori_save', tanggal: Object.keys(dates), result: res };
  } finally {
    lock.releaseLock();
  }
}

// GET ?action=klien&bucket=C03&bulan=Oktober&tahun=2026
function endpointKlien_(e) {
  const p = (e && e.parameter) || {};
  const bucket = _klienBucket_(p.bucket || '');
  let periode = '';
  if (p.bulan && p.tahun) {
    const idx = BULAN_LIST.indexOf(normBulan_(p.bulan));
    if (idx >= 0) periode = normTahun_(p.tahun) + '-' + String(idx + 1).padStart(2, '0');
  }
  const ss = SpreadsheetApp.openById(CFG.SPREADSHEET_ID);
  const pick = (def, mapFn, bIdx, pIdx) => {
    const sh = ss.getSheetByName(def.name);
    if (!sh) return [];
    return _klienReadAll_(sh, def.head.length)
      .filter(r => (!bucket || _klienTxt_(r[bIdx]) === bucket) && (!periode || _klienTxt_(r[pIdx]) === periode))
      .map(mapFn);
  };
  const agents = pick(KLIEN_SHEETS.AGENT, r => ({
    jenis: _klienTxt_(r[0]), tanggal: _klienTxt_(r[1]), bucket: _klienTxt_(r[3]),
    kufiId: _klienTxt_(r[4]), nama: _klienTxt_(r[5]), tl: _klienTxt_(r[6]), company: _klienTxt_(r[7]),
    outstanding: Number(r[8]) || 0, repay: Number(r[9]) || 0, rate: Number(r[10]) || 0,
    handleTime: Number(r[11]) || 0, load: Number(r[12]) || 0, merah: Number(r[13]) === 1
  }), 3, 2);
  const tls = pick(KLIEN_SHEETS.TL, r => ({
    jenis: _klienTxt_(r[0]), tanggal: _klienTxt_(r[1]), bucket: _klienTxt_(r[3]),
    rank: Number(r[4]) || 0, tl: _klienTxt_(r[5]), company: _klienTxt_(r[6]),
    outstanding: Number(r[7]) || 0, repay: Number(r[8]) || 0, rate: Number(r[9]) || 0, aht: Number(r[10]) || 0
  }), 3, 2);
  const vendor = pick(KLIEN_SHEETS.VENDOR, r => ({
    tanggal: _klienTxt_(r[0]), bucket: _klienTxt_(r[2]), company: _klienTxt_(r[3]), rate: Number(r[4]) || 0
  }), 2, 1);
  // Kategori tiket: semua vendor & semua bucket (tidak difilter bucket)
  let kategori = [];
  const shK = ss.getSheetByName(KLIEN_SHEETS.KATEGORI.name);
  if (shK) {
    kategori = _klienReadAll_(shK, KLIEN_SHEETS.KATEGORI.head.length)
      .filter(r => !periode || _klienTxt_(r[1]) === periode)
      .map(r => ({ tanggal: _klienTxt_(r[0]), company: _klienTxt_(r[2]), kategori: _klienTxt_(r[3]),
        outstanding: Number(r[4]) || 0, repay: Number(r[5]) || 0, rate: Number(r[6]) || 0 }));
  }
  return { success: true, action: 'klien', bucket, periode, agents, tl: tls, vendor, kategori };
}

/*** ============ DATA BAYAR (rekap sumber pembayaran per agent) ============ ***
 * Spreadsheet CFG.DATABAYAR_ID, 1 tab per TL. Kolom (mulai A):
 *   NO | NAMA TL | BUCKET | NAMA AGENT | JUMLAH DATA BAYAR | TANGGAL |
 *   WA | GOJEK | CALL | SMS | SOSIAL MEDIA | SISTEM | PELUNASAN | CICILAN | CATATAN
 * Sel metode boleh angka (jumlah) atau teks penanda ("WA"/"SISTEM"/"1").
 * Kalau hanya 1 metode ditandai teks → seluruh JUMLAH DATA BAYAR dihitung ke metode itu.
 * Kolom dicari dari JUDUL header (bukan posisi), jadi tab dgn susunan berbeda tetap terbaca.
 * Grup "PEMBAYARAN SISTEM PERNAH DISENTUH DARIMANA AJA" (checkbox WA/GOJEK/CALL/SMS/SOSMED/EMAIL)
 * dibaca jadi sentuhMask (bit WA1 GOJEK2 CALL4 SMS8 SOSMED16 EMAIL32).
 * GET ?action=databayar&bulan=Oktober&tahun=2026
 *   → rows: [tab, tl, bucket(NPA/C03/''), agent, jumlah, 'yyyy-mm-dd', wa, gojek, call, sms, sosmed, sistem,
 *            lunas, cicil, catatan, sentuhMask, adaKolomSentuh(1/0), email]
 ***********************************************************************/
function _dbBucket_(v) {
  const s = String(v || '').toUpperCase().replace(/\s+/g, '');
  if (/^NPA/.test(s)) return 'NPA';
  if (/^C[O0]3/.test(s)) return 'C03';
  return '';
}
function endpointDataBayar_(e) {
  const p = (e && e.parameter) || {};
  let tm = -1, ty = 0;
  if (p.bulan && p.tahun) { tm = BULAN_LIST.indexOf(normBulan_(p.bulan)); ty = Number(normTahun_(p.tahun)); }
  const ss = SpreadsheetApp.openById(p.id || CFG.DATABAYAR_ID);
  const tz = Session.getScriptTimeZone();
  const out = [], warn = [], tabs = [];
  const U = v => String(v === null || v === undefined ? '' : v).toUpperCase().replace(/\s+/g, ' ').trim();
  ss.getSheets().forEach(sh => {
    const last = sh.getLastRow();
    if (last < 3) return;
    const width = Math.min(40, sh.getLastColumn());
    const vals = sh.getRange(1, 1, last, width).getValues();
    // ── cari baris header (yg berisi "NAMA AGENT") lalu petakan kolom dari judulnya ──
    // Baris header 1: judul utama / grup (METODE PEMBAYARAN, PEMBAYARAN SISTEM PERNAH DISENTUH…)
    // Baris header 2: sub-judul (WA, GOJEK, CALL, SMS, SOSIAL MEDIA, SISTEM, EMAIL)
    let hr = -1;
    for (let i = 0; i < Math.min(6, vals.length); i++) if (vals[i].some(v => U(v) === 'NAMA AGENT')) { hr = i; break; }
    if (hr < 0) return;
    const h1 = vals[hr], h2 = vals[hr + 1] || [];
    const map = {}; let grp = '';
    h1.forEach((x, i) => {
      if (U(x)) grp = U(x);
      const lab = U(h2[i]) || U(x);
      const g = /METODE/.test(grp) ? 'm:' : /DISENTUH/.test(grp) ? 's:' : '';
      if (lab && map[g + lab] === undefined) map[g + lab] = i;
    });
    const col = k => map[k] === undefined ? -1 : map[k];
    const C = { tl: col('NAMA TL'), bk: col('BUCKET'), ag: col('NAMA AGENT'), jml: col('JUMLAH DATA BAYAR'), tgl: col('TANGGAL'),
      lunas: col('PELUNASAN'), cicil: col('CICILAN'), cat: col('CATATAN'), email: col('m:EMAIL') >= 0 ? col('m:EMAIL') : col('EMAIL') };
    if (C.ag < 0 || C.tgl < 0) return;
    const M = ['WA', 'GOJEK', 'CALL', 'SMS', 'SOSIAL MEDIA', 'SISTEM'].map(k => col('m:' + k));
    const S = ['WA', 'GOJEK', 'CALL', 'SMS', 'SOSIAL MEDIA', 'EMAIL'].map(k => col('s:' + k));
    const hasS = S.some(i => i >= 0) ? 1 : 0;
    tabs.push(sh.getName());
    const rows = [];
    let swapped = 0, noDate = 0;
    const at = (r, i) => i >= 0 ? r[i] : '';
    vals.slice(hr + 2).forEach(r => {
      const agent = String(at(r, C.ag) || '').trim();
      if (!agent || /NAMA AGENT/i.test(agent)) return;
      let d = at(r, C.tgl);
      if (!(d instanceof Date)) {
        const m = String(d || '').trim().match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.]?(\d{2,4})?$/);
        d = m ? new Date(m[3] ? (Number(m[3]) < 100 ? 2000 + Number(m[3]) : Number(m[3])) : (ty || new Date().getFullYear()), Number(m[2]) - 1, Number(m[1])) : null;
      }
      if (d && tm >= 0 && (d.getMonth() !== tm || d.getFullYear() !== ty)) {
        // tanggal terketik terbalik (bulan/hari), mis. 1 Okt tersimpan sbg 10 Jan
        if (d.getDate() - 1 === tm && d.getMonth() <= 11 && d.getFullYear() === ty) {
          d = new Date(ty, tm, d.getMonth() + 1); swapped++;
        } else return; // bukan bulan ini
      }
      if (!d) { noDate++; return; }
      const jml = Number(at(r, C.jml)) || 0;
      const marks = M.map(i => at(r, i));
      const src = marks.map(m => typeof m === 'number' ? m : 0);
      const txt = marks.map((m, i) => (typeof m === 'string' && m.trim()) ? i : -1).filter(i => i >= 0);
      const used = src.reduce((a, b) => a + b, 0);
      if (!used && txt.length === 1) src[txt[0]] = jml;
      else if (!used && txt.length > 1) txt.forEach(i => src[i] = 1);
      const flag = v => typeof v === 'number' ? v : (String(v || '').trim() ? 1 : 0);
      // checklist "pembayaran sistem pernah disentuh dari mana": bit WA1 GOJEK2 CALL4 SMS8 SOSMED16 EMAIL32
      let mask = 0;
      S.forEach((i, k) => { const v = at(r, i); if (v === true || /^(TRUE|YA|V|✓|1)$/i.test(String(v).trim())) mask |= (1 << k); });
      rows.push([sh.getName(), String(at(r, C.tl) || '').trim(), _dbBucket_(at(r, C.bk)), agent, jml,
        Utilities.formatDate(d, tz, 'yyyy-MM-dd')].concat(src, [flag(at(r, C.lunas)), flag(at(r, C.cicil)), String(at(r, C.cat) || '').trim(),
        mask, hasS, flag(at(r, C.email))]));
    });
    // bucket kosong → ikut mayoritas tab
    const cnt = {};
    rows.forEach(x => { if (x[2]) cnt[x[2]] = (cnt[x[2]] || 0) + 1; });
    const maj = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0] || '';
    rows.forEach(x => { if (!x[2]) x[2] = maj; out.push(x); });
    if (swapped) warn.push(sh.getName() + ': ' + swapped + ' tanggal terbalik (hari/bulan) — sudah dikoreksi otomatis');
    if (noDate) warn.push(sh.getName() + ': ' + noDate + ' baris tanpa tanggal — tidak dihitung');
  });
  return { success: true, action: 'databayar', version: 2, tabs, warn,
    cols: ['tab','tl','bucket','agent','jumlah','tanggal','wa','gojek','call','sms','sosmed','sistem','lunas','cicil','catatan','sentuhMask','adaKolomSentuh','email'],
    rows: out };
}

function doPost(e) {
  let result;
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    switch (String(body.action || '').toLowerCase()) {
      case 'klien_save': result = klienSave_(body); break;
      case 'klien_kategori_save': result = klienKategoriSave_(body); break;
      case 'pinj_save': result = pinjSave_(body); break;
      case 'jam_save':  result = jamSave_(body);  break;
      case 'pinjd_save': result = pinjDSave_(body); break;
      default: result = { success: false, message: 'Unknown action: ' + body.action };
    }
  } catch (err) {
    result = { success: false, message: err.message };
  }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

function TEST_klien() {
  Logger.log(JSON.stringify(endpointKlien_({parameter:{bucket:'C03'}})).slice(0, 2000));
}

/*** ============ CEK CALL (data QC internal) ============ ***
 * Membandingkan isian TL di "All Data" dengan data QC:
 *   - Sheet "JUMLAH DATA CALL"    : NO | NAMA | AKUN MICROSIP | per tanggal 2 kolom
 *                                   (Attempt, Duration (s)); "OFF" = libur.
 *     Row 1 = tanggal (dd/mm/yyyy, merge 2 kolom), row 2 = sub-header, data mulai row 3.
 *   - Sheet "DATA CALL TERHUBUNG" : NO | DATE | NAME | AKUN MICROSIP | BUCKET | LINK RECORDING
 *     1 baris = 1 rekaman call terhubung (link yang sama dihitung 1).
 * Attempt QC dibandingkan dengan kolom CALL MANUAL; jumlah rekaman dengan
 * CALL TERHUBUNG. Pencocokan nama agent mengabaikan spasi/tanda baca/huruf besar.
 ***********************************************************/
const QC_SHEET_JUMLAH = 'JUMLAH DATA CALL';
const QC_SHEET_TERHUBUNG = 'DATA CALL TERHUBUNG';

function _qcName_(s) { return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
function _qcDate_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const s = String(v || '').trim();
  let m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (m) return m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0');
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return m[1] + '-' + m[2].padStart(2, '0') + '-' + m[3].padStart(2, '0');
  return '';
}
function _qcNum_(v) {
  const s = String(v === null || v === undefined ? '' : v).trim();
  if (s === '' ) return null;
  if (s === '-') return 0;
  const n = Number(s.replace(/[.,\s]/g, '').replace(/[^\d\-]/g, '')); // angka call/durasi selalu bulat
  return isNaN(n) ? null : n;
}

// → { key "NAMA|yyyy-mm-dd": {attempt, duration, off}, names: {NORM: {nama, akun}} }
function _qcReadJumlah_(ss, periode) {
  const sh = ss.getSheetByName(QC_SHEET_JUMLAH);
  if (!sh) throw new Error('Sheet "' + QC_SHEET_JUMLAH + '" tidak ditemukan.');
  const lr = sh.getLastRow(), lc = sh.getLastColumn();
  if (lr < 3) return { map: {}, names: {} };
  const v = sh.getRange(1, 1, lr, lc).getDisplayValues();
  const dateCols = [];
  for (let c = 3; c < lc; c++) {
    const d = _qcDate_(v[0][c]);
    if (d && (!periode || d.slice(0, 7) === periode)) dateCols.push({ c, d });
  }
  const map = {}, names = {};
  for (let r = 2; r < lr; r++) {
    const nama = String(v[r][1] || '').trim(); if (!nama) continue;
    const k = _qcName_(nama);
    names[k] = { nama, akun: String(v[r][2] || '').trim() };
    dateCols.forEach(dc => {
      const a = String(v[r][dc.c] || '').trim(), du = String(v[r][dc.c + 1] || '').trim();
      if (a === '' && du === '') return;
      const off = a.toUpperCase() === 'OFF';
      map[k + '|' + dc.d] = { attempt: off ? 0 : _qcNum_(a), duration: off ? 0 : _qcNum_(du), off };
    });
  }
  return { map, names };
}

// → { key: {count, dup}, names: {NORM: true} }
function _qcReadTerhubung_(ss, periode) {
  const sh = ss.getSheetByName(QC_SHEET_TERHUBUNG);
  if (!sh) return { map: {}, names: {}, available: false };
  const lr = sh.getLastRow();
  if (lr < 2) return { map: {}, names: {}, available: true };
  const v = sh.getRange(2, 1, lr - 1, 6).getDisplayValues();
  const map = {}, names = {}, seen = {};
  v.forEach(r => {
    const d = _qcDate_(r[1]), k = _qcName_(r[2]);
    if (!d || !k) return;
    names[k] = true;
    if (periode && d.slice(0, 7) !== periode) return;
    const key = k + '|' + d, link = String(r[5] || '').trim();
    const o = map[key] || (map[key] = { count: 0, dup: 0 });
    const lk = key + '|' + link;
    if (link && seen[lk]) { o.dup++; return; }
    seen[lk] = true; o.count++;
  });
  return { map, names, available: true };
}

// GET ?action=qccheck&bulan=Oktober&tahun=2026
function endpointQcCheck_(e) {
  const p = (e && e.parameter) || {};
  const bulan = normBulan_(p.bulan || ''), tahun = normTahun_(p.tahun || '');
  const bi = BULAN_LIST.indexOf(bulan);
  if (bi < 0 || !tahun) throw new Error('Parameter bulan & tahun wajib.');
  const periode = tahun + '-' + String(bi + 1).padStart(2, '0');
  const ss = SpreadsheetApp.openById(CFG.SPREADSHEET_ID);
  const J = _qcReadJumlah_(ss, periode);
  const T = _qcReadTerhubung_(ss, periode);

  let rows = _cacheGet('svc_agentdata_raw');
  if (!rows) rows = readInputData().rows;
  rows = rows.filter(r => r.bulan === bulan && r.tahun === tahun);

  const qcNames = Object.assign({}, J.names);
  const matched = {};
  const out = [];
  rows.forEach(r => {
    const k = _qcName_(r.agent);
    if (!k || !qcNames[k]) return;
    matched[k] = true;
    const j = J.map[k + '|' + r.tanggal], t = T.map[k + '|' + r.tanggal];
    out.push([r.tanggal, r.agent, r.teamLeader, r.supervisor || '', r.aplikasi, r.bucket, r.absensi,
      r.callManual || 0, r.callTerhubung || 0,
      j ? j.attempt : null, j ? j.duration : null, j && j.off ? 1 : 0,
      T.names[k] ? (t ? t.count : 0) : null, t ? t.dup : 0, qcNames[k].akun || '']);
  });
  // Agent yg ada di QC (punya attempt bulan ini) tapi tidak ketemu di All Data
  const unmatched = [];
  Object.keys(qcNames).forEach(k => {
    if (matched[k]) return;
    let tot = 0, days = 0;
    Object.keys(J.map).forEach(key => { if (key.indexOf(k + '|') === 0 && J.map[key].attempt > 0) { tot += J.map[key].attempt; days++; } });
    if (days) unmatched.push({ nama: qcNames[k].nama, akun: qcNames[k].akun, attempt: tot, hari: days });
  });
  unmatched.sort((a, b) => b.attempt - a.attempt);
  // Daftar semua agent per TL bulan ini (termasuk yg tidak ada di QC) + tanggal
  // pertama/terakhir muncul → dipakai utk "X dari Y agent" & label rotasi.
  const ros = {};
  rows.forEach(r => {
    const key = (r.teamLeader || '') + '|' + _qcName_(r.agent);
    const o = ros[key] || (ros[key] = [r.teamLeader || '', r.agent, r.aplikasi, r.bucket, r.tanggal, r.tanggal, 0]);
    if (r.tanggal < o[4]) o[4] = r.tanggal;
    if (r.tanggal > o[5]) o[5] = r.tanggal;
    if (_qcName_(r.agent) && qcNames[_qcName_(r.agent)]) o[6] = 1;
  });
  return {
    success: true, action: 'qccheck', periode,
    cols: ['tanggal','agent','tl','spv','aplikasi','bucket','absensi','tlCall','tlConn','qcAtt','qcDur','qcOff','qcConn','qcDup','qcAkun'],
    rows: out, unmatched, terhubungTersedia: T.available,
    roster: Object.keys(ros).map(k => ros[k]) // [tl, agent, aplikasi, bucket, tglPertama, tglTerakhir, adaDiQC]
  };
}

function TEST_qccheck() {
  const r = endpointQcCheck_({ parameter: { bulan: 'Oktober', tahun: '2026' } });
  Logger.log('rows=' + r.rows.length + ' unmatched=' + r.unmatched.length);
  Logger.log(JSON.stringify(r.rows.slice(0, 5)));
  Logger.log(JSON.stringify(r.unmatched.slice(0, 10)));
}


/*** ============ CEK KELENGKAPAN DATA ============ ***
 * GET ?action=kelengkapan&bulan=Oktober&tahun=2026
 * Membaca sel MENTAH "All Data" (bukan hasil normalisasi, karena sel kosong
 * dinormalisasi jadi 0) supaya bisa dibedakan "belum diisi" vs "diisi 0".
 *  rows : [noBaris, tanggal, aplikasi, bucket, spv, tl, agent, absensi,
 *          kosongMask, nilai[...KF], dibaca sbg teks/anomali mask]
 *    kosongMask bit i = kolom KF[i] kosong
 *  databayar : per tab → tanggal terisi, baris jumlah>0 tanpa sumber
 *  rank      : per sheet RANK <SPV> → tanggal terakhir daily & monthly per bucket
 *  klien     : tanggal laporan klien daily/monthly per bucket
 ***********************************************************/
const KF_ = [
  ['Total Data', COL.TOTAL_DATA], ['Daily Payment', COL.DAILY_PAYMENT], ['Jml Data Bayar', COL.JML_DATA_BAYAR],
  ['Call Manual', COL.CALL_MANUAL], ['Call Terhubung', COL.CALL_TERHUBUNG], ['Sentuh WA', COL.SENTUH_WA],
  ['Sentuh Gojek', COL.SENTUH_GOJEK], ['Sentuh WABA', COL.SENTUH_WABA], ['SMS Manual', COL.SMS_MANUAL],
  ['PTP', COL.PTP], ['PTP Bayar', COL.PTP_BAYAR], ['Autocall', COL.AUTOCALL], ['Data Baru', COL.DATA_BARU],
  ['Respon WA', COL.RESPON_WA], ['Alat WA', COL.ALAT_WA], ['Nama Akun', COL.NAMA_AKUN]
];
function endpointKelengkapan_(e) {
  const p = (e && e.parameter) || {};
  const bulan = normBulan_(p.bulan || ''), tahun = normTahun_(p.tahun || '');
  const bi = BULAN_LIST.indexOf(bulan);
  if (bi < 0 || !tahun) throw new Error('Parameter bulan & tahun wajib.');
  const periode = tahun + '-' + String(bi + 1).padStart(2, '0');
  const tz = Session.getScriptTimeZone();
  const ss = SpreadsheetApp.openById(CFG.SPREADSHEET_ID);
  const out = { success: true, action: 'kelengkapan', periode, today: Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd'),
    fields: KF_.map(f => f[0]), rows: [], warn: [] };

  // ── All Data ──
  const sh = ss.getSheetByName(CFG.SHEET_ALL_DATA);
  const last = sh.getLastRow();
  if (last >= CFG.DATA_START_ROW) {
    const n = last - CFG.DATA_START_ROW + 1;
    const raw = sh.getRange(CFG.DATA_START_ROW, 1, n, TOTAL_COLS).getValues();
    const disp = sh.getRange(CFG.DATA_START_ROW, COL.TANGGAL + 1, n, 1).getDisplayValues();
    const shRef = ss.getSheetByName(CFG.SHEET_REFERENSI);
    const supMap = shRef && shRef.getLastRow() >= 2
      ? buildSupervisorMap_(shRef.getRange(2, 1, shRef.getLastRow() - 1, REF_TOTAL_COLS).getValues()) : {};
    const blank = v => v === '' || v === null || v === undefined || (typeof v === 'string' && !v.trim());
    raw.forEach((r, i) => {
      const tgl = normTanggal_(r[COL.TANGGAL] instanceof Date ? r[COL.TANGGAL] : disp[i][0]);
      let inMonth = tgl ? tgl.slice(0, 7) === periode : false;
      if (!tgl) {
        // tanggal kosong/tidak valid: ikut kalau kolom BULAN/TAHUN cocok & ada nama agent/TL
        if (!(normBulan_(r[COL.BULAN]) === bulan && normTahun_(r[COL.TAHUN]) === tahun)) return;
        if (blank(r[COL.AGENT]) && blank(r[COL.TEAM_LEADER])) return;
        inMonth = true;
      }
      if (!inMonth) return;
      if (blank(r[COL.AGENT]) && blank(r[COL.TEAM_LEADER]) && blank(r[COL.ABSENSI])) return;
      let mask = 0;
      const vals = KF_.map((f, k) => {
        const v = r[f[1]];
        if (blank(v)) { mask |= (1 << k); return null; }
        if (k === KF_.length - 1) return 1; // Nama Akun: cukup terisi/tidak
        if (typeof v === 'number') return v;
        const nv = f[1] === COL.DAILY_PAYMENT ? normRupiah_(v) : normNumber_(v);
        return /\d/.test(String(v)) ? nv : String(v).trim().slice(0, 20); // teks non-angka dikirim apa adanya
      });
      out.rows.push([CFG.DATA_START_ROW + i, tgl || '', normText_(r[COL.APLIKASI]), normText_(r[COL.BUCKET]),
        lookupSupervisor_(supMap, r[COL.APLIKASI], r[COL.BUCKET], tahun), normText_(r[COL.TEAM_LEADER]),
        normText_(r[COL.AGENT]), normAbsensi_(r[COL.ABSENSI]), mask].concat(vals));
    });
  }

  // ── Data Bayar ──
  try {
    const db = endpointDataBayar_({ parameter: { bulan, tahun } });
    const tabs = {};
    (db.tabs || []).forEach(t => tabs[t] = { tab: t, tl: '', bucket: '', dates: {}, rows: 0, noSrc: [] });
    db.rows.forEach(x => {
      const t = tabs[x[0]] || (tabs[x[0]] = { tab: x[0], tl: '', bucket: '', dates: {}, rows: 0, noSrc: [] });
      t.tl = t.tl || x[1]; t.bucket = t.bucket || x[2]; t.rows++;
      t.dates[x[5]] = (t.dates[x[5]] || 0) + 1;
      const src = x[6] + x[7] + x[8] + x[9] + x[10] + x[11];
      if (x[4] > 0 && !src && t.noSrc.length < 30) t.noSrc.push([x[5], x[3], x[4]]);
    });
    out.databayar = { warn: db.warn || [], tabs: Object.keys(tabs).map(k => tabs[k]) };
  } catch (err) { out.warn.push('Data Bayar tidak terbaca: ' + err.message); }

  // ── Sheet RANK per SPV (RANK RIAN, RANK RIZKI, ...) & DATA RANK ──
  try {
    out.rank = [];
    ss.getSheets().forEach(s => {
      const nm = s.getName();
      if (!/^(DATA )?RANK\b/i.test(nm) || s.getLastRow() < CFG.RANK_DATA_START_ROW) return;
      const v = s.getRange(CFG.RANK_DATA_START_ROW, 1, s.getLastRow() - CFG.RANK_DATA_START_ROW + 1, Math.min(19, s.getMaxColumns())).getValues();
      const info = { sheet: nm, daily: {}, monthly: {} };
      const put = (obj, d, b) => { const t = normTanggal_(d); if (!t || t.slice(0, 7) !== periode) return; const k = normText_(b) || '-'; if (!obj[k] || t > obj[k]) obj[k] = t; };
      v.forEach(r => {
        if (normText_(r[RANKCOL.D_VENDOR])) put(info.daily, r[RANKCOL.D_TANGGAL], r[RANKCOL.D_BUCKET]);
        if (r.length > RANKCOL.M_VENDOR && normText_(r[RANKCOL.M_VENDOR])) put(info.monthly, r[RANKCOL.M_TANGGAL], r[RANKCOL.M_BUCKET]);
      });
      out.rank.push(info);
    });
  } catch (err) { out.warn.push('Sheet RANK tidak terbaca: ' + err.message); }

  // ── Laporan Klien (upload) ──
  try {
    const shA = ss.getSheetByName(KLIEN_SHEETS.AGENT.name);
    const k = {};
    if (shA) _klienReadAll_(shA, 4).forEach(r => {
      const tgl = _klienTxt_(r[1]);
      if (_klienTxt_(r[2]) !== periode && tgl.slice(0, 7) !== periode) return;
      const key = _klienTxt_(r[3]) + '|' + _klienTxt_(r[0]);
      (k[key] = k[key] || {})[tgl] = 1;
    });
    out.klien = Object.keys(k).map(x => ({ bucket: x.split('|')[0], jenis: x.split('|')[1], dates: Object.keys(k[x]).sort() }));
  } catch (err) { out.warn.push('Laporan Klien tidak terbaca: ' + err.message); }

  return out;
}

function TEST_kelengkapan() {
  const r = endpointKelengkapan_({ parameter: { bulan: 'Oktober', tahun: '2026' } });
  Logger.log('rows=' + r.rows.length + ' warn=' + JSON.stringify(r.warn));
  Logger.log(JSON.stringify(r.rows.slice(0, 5)));
  Logger.log(JSON.stringify({ databayar: r.databayar, rank: r.rank, klien: r.klien }).slice(0, 3000));
}


/*** ============ LAPORAN KLIEN — PINJAMIN (Performance ranking) ============ ***
 * File Excel dari klien "Performance_ranking_YYYY_MM_DD.xlsx" (semua vendor) atau
 * "EDN_Performance_ranking_…" (EDN saja). 1 upload = 1 snapshot per TANGGAL.
 * Simpan: POST {action:'pinj_save', tanggal:'yyyy-mm-dd', rows:[[...PINJ_HEAD tanpa TANGGAL/PERIODE/PROJECT/DIUPLOAD]]}
 *   → baris lama dgn TANGGAL sama & COMPANY yg ada di upload diganti (upload EDN saja tidak menghapus vendor lain).
 * Baca: GET ?action=pinj&bulan=Oktober&tahun=2026 → {dates, cols, rows}
 ***********************************************************/
const PINJ_SHEET = { name: 'KLIEN_PINJAMIN',
  head: ['TANGGAL','PERIODE','PROJECT','GROUP','ASSET_GROUP','SETUP','OUT_SELF','DPD','COMPANY','MANAGER','TL_NO','TL',
         'AGENT_NO','AGENT','USER_ID','BARU','TGL_MASUK','INTERVAL','POKOK','TERBAYAR','RATE','HARI','GROSS','RANK','DIUPLOAD'],
  textCols: 18 };
function pinjSave_(body) {
  const tanggal = String(body.tanggal || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) throw new Error('Tanggal laporan tidak valid: ' + tanggal);
  const rows = body.rows || [];
  if (!rows.length) throw new Error('Tidak ada baris data.');
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const ss = SpreadsheetApp.openById(CFG.SPREADSHEET_ID);
    const sh = _klienSheet_(ss, PINJ_SHEET);
    const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
    const num = v => Number(v) || 0, txt = v => v === null || v === undefined ? '' : String(v).trim();
    const out = rows.map(r => [tanggal, tanggal.slice(0, 7), 'PINJAMIN'].concat(
      r.slice(0, 15).map(txt), [num(r[15]), num(r[16]), num(r[17]), num(r[18]), num(r[19]), num(r[20]), now]));
    const comps = {}; out.forEach(r => comps[r[8]] = 1);
    const res = _klienReplace_(sh, PINJ_SHEET, r => _klienTxt_(r[0]) === tanggal && !!comps[_klienTxt_(r[8])], out);
    return { success: true, action: 'pinj_save', tanggal, companies: Object.keys(comps), result: res };
  } finally { lock.releaseLock(); }
}
function endpointPinj_(e) {
  const p = (e && e.parameter) || {};
  let periode = '';
  if (p.bulan && p.tahun) {
    const idx = BULAN_LIST.indexOf(normBulan_(p.bulan));
    if (idx >= 0) periode = normTahun_(p.tahun) + '-' + String(idx + 1).padStart(2, '0');
  }
  const ss = SpreadsheetApp.openById(CFG.SPREADSHEET_ID);
  const sh = ss.getSheetByName(PINJ_SHEET.name);
  const all = sh ? _klienReadAll_(sh, PINJ_SHEET.head.length) : [];
  // snapshot terakhir bulan sebelumnya ikut dikirim sbg pembanding awal bulan
  const prevOf = per => { const y = +per.slice(0, 4), m = +per.slice(5, 7); return m === 1 ? (y - 1) + '-12' : y + '-' + String(m - 1).padStart(2, '0'); };
  const prev = periode ? prevOf(periode) : '';
  let prevLast = '';
  all.forEach(r => { const t = _klienTxt_(r[0]); if (prev && t.slice(0, 7) === prev && t > prevLast) prevLast = t; });
  const rows = all.filter(r => { const t = _klienTxt_(r[0]); return !periode || t.slice(0, 7) === periode || t === prevLast; })
    .map(r => r.slice(0, 24).map((v, i) => i < PINJ_SHEET.textCols ? _klienTxt_(v) : (Number(v) || 0)));
  const dates = [...new Set(rows.map(r => r[0]))].sort();
  return { success: true, action: 'pinj', periode, prevLast, dates, cols: PINJ_SHEET.head.slice(0, 24), rows };
}


/*** ============ PERGERAKAN PER JAM (worker_performance_record) ============ ***
 * File "worker_performance_record_YYYY-MM-DD_HHMMSS.xlsx" (tarikan sistem klien, akumulasi
 * hari itu s/d jam tarik). 1 upload = 1 snapshot per (TANGGAL, JAM, BUCKET).
 * Simpan: POST {action:'jam_save', tanggal, jam:'HH:MM', rows:[[BUCKET,ROLE,STAFF_ID,NAMA,OS,REPAY,TARGET,
 *          HANDLE_TIMES,HANDLE_NUM,COMPLETE,LOAD,NEW_ASSIGN,CALLOUT,RANK]]}
 *   → baris lama dgn TANGGAL+JAM sama & BUCKET yg ada di upload diganti.
 * Baca: GET ?action=jam&tanggal=yyyy-mm-dd → {tanggal, dates, cols, rows}
 ***********************************************************/
const JAM_SHEET = { name: 'KLIEN_JAM',
  head: ['TANGGAL','JAM','BUCKET','ROLE','STAFF_ID','NAMA','OS','REPAY','TARGET_RATE','HANDLE_TIMES','HANDLE_NUM',
         'COMPLETE','LOAD','NEW_ASSIGN','CALLOUT_RATE','RANK','DIUPLOAD'],
  textCols: 6 };
function jamSave_(body) {
  const tanggal = String(body.tanggal || '').slice(0, 10);
  const jam = String(body.jam || '').slice(0, 5);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) throw new Error('Tanggal tidak valid: ' + tanggal);
  if (!/^\d{2}:\d{2}$/.test(jam)) throw new Error('Jam tidak valid: ' + jam);
  const rows = body.rows || [];
  if (!rows.length) throw new Error('Tidak ada baris data.');
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const ss = SpreadsheetApp.openById(CFG.SPREADSHEET_ID);
    const sh = _klienSheet_(ss, JAM_SHEET);
    const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
    const num = v => Number(v) || 0, txt = v => v === null || v === undefined ? '' : String(v).trim();
    const out = rows.map(r => [tanggal, jam].concat(r.slice(0, 4).map(txt), r.slice(4, 14).map(num), [now]));
    const bk = {}; out.forEach(r => bk[r[2]] = 1);
    const res = _klienReplace_(sh, JAM_SHEET,
      r => _klienTxt_(r[0]) === tanggal && _jamTxt_(r[1]) === jam && !!bk[_klienTxt_(r[2])], out);
    return { success: true, action: 'jam_save', tanggal, jam, buckets: Object.keys(bk), result: res };
  } finally { lock.releaseLock(); }
}
function _jamTxt_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'HH:mm');
  return String(v || '').trim().slice(0, 5);
}
function endpointJam_(e) {
  const p = (e && e.parameter) || {};
  const ss = SpreadsheetApp.openById(CFG.SPREADSHEET_ID);
  const sh = ss.getSheetByName(JAM_SHEET.name);
  const all = sh ? _klienReadAll_(sh, JAM_SHEET.head.length) : [];
  const dset = {};
  all.forEach(r => { const t = _klienTxt_(r[0]); if (t) dset[t] = 1; });
  const dates = Object.keys(dset).sort();
  const tanggal = /^\d{4}-\d{2}-\d{2}$/.test(String(p.tanggal || '')) ? String(p.tanggal) : (dates[dates.length - 1] || '');
  const rows = all.filter(r => _klienTxt_(r[0]) === tanggal)
    .map(r => r.slice(0, 16).map((v, i) => i === 1 ? _jamTxt_(v) : i < JAM_SHEET.textCols ? _klienTxt_(v) : (Number(v) || 0)));
  return { success: true, action: 'jam', tanggal, dates, cols: JAM_SHEET.head.slice(0, 16), rows };
}


/*** ============ PINJAMIN HARIAN (Report.performance per hari) ============ ***
 * File harian dari sistem Pinjamin (kolom "Statistics Date", "Report.performance.*",
 * "Business Group" mis. A2-EDN / B1-QIN / M2-CPU / P). Isi = hasil HARI ITU s/d jam tarik.
 * Ditarik beberapa kali sehari (JAM = 'HH:MM') + file final besok paginya (JAM = 'FINAL').
 * Simpan: POST {action:'pinjd_save', tanggal, jam, rows:[[GROUP,VENDOR,BG,TL,TL_NO,AGENT,AGENT_NO, ...PINJD_NUM]]}
 *   → baris lama dgn TANGGAL+JAM sama & VENDOR yg ada di upload diganti.
 * Baca: GET ?action=pinjd&tanggal=yyyy-mm-dd → {tanggal, dates, cols, rows, trend}
 *   trend = ringkasan per tanggal (snapshot FINAL, kalau belum ada pakai jam terakhir) per GROUP+VENDOR+TL, bulan yg sama.
 ***********************************************************/
const PINJD_NUM = ['CASE','CASE_BARU','CASE_INHAND','POKOK_INHAND','POKOK','TERBAYAR','TERBAYAR_HARIAN','GROSS',
  'CALL','CALL_TERSAMBUNG','CALL_SELF','CALL_DARURAT','CASE_DITELEPON','KEDALAMAN','DURASI_DETIK','SMS',
  'COVERAGE','COVERAGE_INHAND','HARI_ONLINE','WABA','AUTO'];
const PINJD_SHEET = { name: 'KLIEN_PINJ_HARIAN',
  head: ['TANGGAL','JAM','GROUP','VENDOR','BG','TL','TL_NO','AGENT','AGENT_NO'].concat(PINJD_NUM, ['DIUPLOAD']),
  textCols: 9 };
function pinjDSave_(body) {
  const tanggal = String(body.tanggal || '').slice(0, 10);
  const jam = String(body.jam || '').toUpperCase() === 'FINAL' ? 'FINAL' : String(body.jam || '').slice(0, 5);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) throw new Error('Tanggal tidak valid: ' + tanggal);
  if (jam !== 'FINAL' && !/^\d{2}:\d{2}$/.test(jam)) throw new Error('Jam tidak valid: ' + jam);
  const rows = body.rows || [];
  if (!rows.length) throw new Error('Tidak ada baris data.');
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const ss = SpreadsheetApp.openById(CFG.SPREADSHEET_ID);
    const sh = _klienSheet_(ss, PINJD_SHEET);
    const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
    const num = v => Number(v) || 0, txt = v => v === null || v === undefined ? '' : String(v).trim();
    const nN = PINJD_NUM.length;
    const out = rows.map(r => [tanggal, jam].concat(r.slice(0, 7).map(txt), r.slice(7, 7 + nN).map(num), [now]));
    const vend = {}; out.forEach(r => vend[r[3]] = 1);
    const res = _klienReplace_(sh, PINJD_SHEET,
      r => _klienTxt_(r[0]) === tanggal && _jamTxt_(r[1]).toUpperCase() === jam && !!vend[_klienTxt_(r[3])], out);
    return { success: true, action: 'pinjd_save', tanggal, jam, vendors: Object.keys(vend), result: res };
  } finally { lock.releaseLock(); }
}
function endpointPinjD_(e) {
  const p = (e && e.parameter) || {};
  const ss = SpreadsheetApp.openById(CFG.SPREADSHEET_ID);
  const sh = ss.getSheetByName(PINJD_SHEET.name);
  const W = PINJD_SHEET.head.length - 1;
  const all = (sh ? _klienReadAll_(sh, W) : []).map(r => r.map((v, i) =>
    i === 1 ? _jamTxt_(v).toUpperCase() : i < PINJD_SHEET.textCols ? _klienTxt_(v) : (Number(v) || 0)));
  const dset = {};
  all.forEach(r => { if (r[0]) dset[r[0]] = 1; });
  const dates = Object.keys(dset).sort();
  const tanggal = /^\d{4}-\d{2}-\d{2}$/.test(String(p.tanggal || '')) ? String(p.tanggal) : (dates[dates.length - 1] || '');
  const rows = all.filter(r => r[0] === tanggal);
  // ringkasan tren 1 bulan: snapshot terbaik per tanggal (FINAL > jam terakhir)
  const per = tanggal.slice(0, 7), best = {};
  all.forEach(r => { if (r[0].slice(0, 7) !== per) return;
    const k = r[1] === 'FINAL' ? '99:99' : r[1];
    if (!best[r[0]] || k > best[r[0]]) best[r[0]] = k; });
  const ci = name => PINJD_SHEET.head.indexOf(name);
  const I = { pokok: ci('POKOK'), paid: ci('TERBAYAR'), gross: ci('GROSS'), call: ci('CALL'), conn: ci('CALL_TERSAMBUNG'), dur: ci('DURASI_DETIK') };
  const agg = {};
  all.forEach(r => { if (r[0].slice(0, 7) !== per) return;
    const k = r[1] === 'FINAL' ? '99:99' : r[1]; if (k !== best[r[0]]) return;
    const key = [r[0], r[1], r[2], r[3], r[5]].join('|');
    const a = agg[key] || (agg[key] = [r[0], r[1], r[2], r[3], r[5], 0, 0, 0, 0, 0, 0, 0, 0]);
    a[5]++; a[6] += r[I.pokok]; a[7] += r[I.paid]; a[8] += r[I.gross]; a[9] += r[I.call]; a[10] += r[I.conn]; a[11] += r[I.dur];
    if (!r[I.gross]) a[12]++; });
  return { success: true, action: 'pinjd', tanggal, dates, cols: PINJD_SHEET.head.slice(0, W), rows,
    trendCols: ['TANGGAL','JAM','GROUP','VENDOR','TL','AGENT','POKOK','TERBAYAR','GROSS','CALL','CALL_TERSAMBUNG','DURASI_DETIK','AGENT_NOL'],
    trend: Object.keys(agg).sort().map(k => agg[k]) };
}
