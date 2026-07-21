/*******************************************************
 * DESK COLLECTION ANALYTICS — BACKEND (Apps Script)
 * Final Version — semua endpoint termasuk referensi
 *******************************************************/

/*** ============ CFG ============ ***/
const CFG = {
  SPREADSHEET_ID: '1zcWzcEN_R1qClSKPsvp2Fica_j7iDwq_Qqcg3Mude3k',
  SHEET_ALL_DATA: 'All Data',
  SHEET_REFERENSI: 'Referensi Akun',
  HEADER_ROW: 1,
  DATA_START_ROW: 2
};

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
    alatWA: normText_(row[COL.ALAT_WA]),
    alatGojek: normText_(row[COL.ALAT_GOJEK]),
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
function doGet(e) {
  try {
    const action = (e.parameter.action || 'home').toLowerCase();
    let result;
    switch (action) {
      case 'home':      result = endpointHome_(e);      break;
      case 'agentdata': result = endpointAgentData_(e); break;
      case 'weekly':    result = endpointWeekly_(e);    break;
      case 'referensi': result = endpointReferensi_(e); break;
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
  const { rows } = readInputData();
  let filtered = rows;
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
  return {
    success: true, action: 'referensi',
    rows,
    aplikasiList: Object.keys(aplikasiSet).sort(),
    bucketList:   Object.keys(bucketSet).sort()
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
