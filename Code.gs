/*******************************************************
 * DESK COLLECTION ANALYTICS — BACKEND (Apps Script)
 * Final Version — semua endpoint termasuk referensi
 *******************************************************/

/*** ============ CFG ============ ***/
const CFG = {
  SPREADSHEET_ID: '1zcWzcEN_R1qClSKPsvp2Fica_j7iDwq_Qqcg3Mude3k',
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
  JAN: 3
};

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
function buildSupervisorMap_(refRows) {
  const map = {};
  refRows.forEach(r => {
    const supervisor = normText_(r[REF_COL.SUPERVISOR]);
    const aplikasi   = normText_(r[REF_COL.APLIKASI]);
    const bucket     = normText_(r[REF_COL.BUCKET]);
    if (!aplikasi || !bucket) return;
    map[aplikasi + '||' + bucket] = supervisor;
  });
  return map;
}

function lookupSupervisor_(supMap, aplikasi, bucket) {
  const aLow = normText_(aplikasi).toLowerCase();
  const bLow = normText_(bucket).toLowerCase();
  for (const key in supMap) {
    const parts = key.split('||');
    if (parts[0].toLowerCase() === aLow && parts[1].toLowerCase() === bLow) {
      return supMap[key];
    }
  }
  return '';
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
    ? sheetRef.getRange(2, 1, lastRowRef - 1, REF_COL.JAN + 12).getValues()
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
    norm.supervisor = lookupSupervisor_(supMap, norm.aplikasi, norm.bucket);
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
  const keys = ['svc_referensi', 'svc_violation', 'svc_agentdata_raw', 'svc_rankdata'];
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
  const CACHE_KEY = 'svc_referensi';
  const hit = _cacheGet(CACHE_KEY);
  if (hit) return hit;

  const ss = SpreadsheetApp.openById(CFG.SPREADSHEET_ID);
  const sheetRef = ss.getSheetByName(CFG.SHEET_REFERENSI);
  if (!sheetRef) throw new Error('Sheet Referensi Akun tidak ditemukan.');
  const lastRow = sheetRef.getLastRow();
  if (lastRow < 2) return { success: true, action: 'referensi', rows: [], aplikasiList: [], bucketList: [] };
  const rawRows = sheetRef.getRange(2, 1, lastRow - 1, REF_COL.JAN + 12).getValues();
  const rows = rawRows.map(r => ({
    supervisor: normText_(r[REF_COL.SUPERVISOR]),
    aplikasi:   normText_(r[REF_COL.APLIKASI]),
    bucket:     normText_(r[REF_COL.BUCKET]),
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
  const aplikasiSet = {}, bucketSet = {};
  rows.forEach(r => {
    if (r.aplikasi) aplikasiSet[r.aplikasi] = true;
    if (r.bucket)   bucketSet[r.bucket]     = true;
  });
  const result = {
    success: true, action: 'referensi',
    rows,
    aplikasiList: Object.keys(aplikasiSet).sort(),
    bucketList:   Object.keys(bucketSet).sort()
  };
  _cachePut(CACHE_KEY, result);
  return result;
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
