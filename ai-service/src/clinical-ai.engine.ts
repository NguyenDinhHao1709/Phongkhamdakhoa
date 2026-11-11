/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CLINICAL AI ENGINE (BỘ NÃO Y KHOA CHUYÊN SÂU — NÂNG CẤP MỤC 3 KLTN)
 * ═══════════════════════════════════════════════════════════════════════════════
 * Bao gồm 3 trụ cột AI Lâm sàng:
 * 1. RAG trên Phác đồ Chẩn đoán & Điều trị chuẩn Bộ Y tế (Hybrid Vector Search + LLM)
 * 2. Computer Vision & Phân tích Chuyên sâu Cận lâm sàng (Multi-biomarker + Imaging AI)
 * 3. Hệ thống Kiểm duyệt Tương tác Thuốc, Dị ứng & Chức năng Gan/Thận Thời gian thực
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { MOH_CLINICAL_PROTOCOLS_KB } from './moh-protocols.data';
export { MOH_CLINICAL_PROTOCOLS_KB } from './moh-protocols.data';

// ─── 2. DANH MỤC TƯƠNG TÁC THUỐC & CHỐNG CHỈ ĐỊNH DƯỢC LÂM SÀNG ─────────────
interface DrugSafetyProfile {
  key: string;
  patterns: RegExp[];
  drugClass: string;
  activeIngredient: string;
  allergyGroup?: string;
  hepatotoxicRisk: 'low' | 'moderate' | 'high';
  nephrotoxicRisk: 'low' | 'moderate' | 'high';
  giBleedingRisk: 'low' | 'moderate' | 'high';
  contraindicatedIcdPrefixes?: string[];
  foodInstruction: string;
}

const DRUG_SAFETY_CATALOG: DrugSafetyProfile[] = [
  {
    key: 'PARACETAMOL',
    patterns: [/paracetamol/i, /acetaminophen/i, /panadol/i, /efferalgan/i, /hapacol/i],
    drugClass: 'Giảm đau - Hạ sốt (Non-opioid)',
    activeIngredient: 'Paracetamol (Acetaminophen)',
    allergyGroup: 'paracetamol',
    hepatotoxicRisk: 'high',
    nephrotoxicRisk: 'low',
    giBleedingRisk: 'low',
    foodInstruction: 'Uống sau ăn, cách nhau tối thiểu 4-6 giờ (không quá 4g/ngày ở người lớn).',
  },
  {
    key: 'NSAID',
    patterns: [/ibuprofen/i, /meloxicam/i, /mobic/i, /diclofenac/i, /voltaren/i, /celecoxib/i, /celebrex/i, /piroxicam/i, /naproxen/i, /etoricoxib/i],
    drugClass: 'Kháng viêm không Steroid (NSAID)',
    activeIngredient: 'NSAID (Meloxicam / Ibuprofen / Celecoxib / Diclofenac)',
    allergyGroup: 'nsaid',
    hepatotoxicRisk: 'moderate',
    nephrotoxicRisk: 'high',
    giBleedingRisk: 'high',
    contraindicatedIcdPrefixes: ['K25', 'K26', 'K27', 'K29', 'A97', 'N18'],
    foodInstruction: 'BẮT BUỘC uống ngay sau bữa ăn no để giảm kích ứng và loét niêm mạc dạ dày.',
  },
  {
    key: 'ASPIRIN',
    patterns: [/aspirin/i, /acetylsalicylic/i],
    drugClass: 'Chống kết tập tiểu cầu / NSAID',
    activeIngredient: 'Acid Acetylsalicylic (Aspirin)',
    allergyGroup: 'nsaid',
    hepatotoxicRisk: 'low',
    nephrotoxicRisk: 'moderate',
    giBleedingRisk: 'high',
    contraindicatedIcdPrefixes: ['K25', 'K26', 'K29', 'A97'],
    foodInstruction: 'Uống sau ăn no.',
  },
  {
    key: 'CORTICOID',
    patterns: [/prednisolon/i, /methylprednisolon/i, /medrol/i, /dexamethason/i, /betamethason/i],
    drugClass: 'Corticosteroid kháng viêm',
    activeIngredient: 'Corticosteroid (Prednisolone / Methylprednisolone)',
    hepatotoxicRisk: 'low',
    nephrotoxicRisk: 'low',
    giBleedingRisk: 'high',
    contraindicatedIcdPrefixes: ['K25', 'K26', 'K29', 'E11', 'I10'],
    foodInstruction: 'Uống 1 lần vào buổi sáng (khoảng 8h sáng) ngay sau ăn no.',
  },
  {
    key: 'PENICILLIN_BETA_LACTAM',
    patterns: [/amoxicillin/i, /augmentin/i, /klamentin/i, /ampicillin/i, /penicillin/i, /clavulan/i],
    drugClass: 'Kháng sinh Beta-lactam (Nhóm Penicillin)',
    activeIngredient: 'Amoxicillin (± Acid Clavulanic)',
    allergyGroup: 'beta_lactam',
    hepatotoxicRisk: 'moderate',
    nephrotoxicRisk: 'low',
    giBleedingRisk: 'low',
    foodInstruction: 'Uống ngay đầu bữa ăn hoặc sau ăn để tối ưu hấp thu và giảm rối loạn tiêu hóa.',
  },
  {
    key: 'CEPHALOSPORIN',
    patterns: [/cefuroxim/i, /zinnat/i, /cephalexin/i, /cefixim/i, /cefdinir/i, /cefpodoxim/i, /ceftriaxon/i],
    drugClass: 'Kháng sinh Beta-lactam (Nhóm Cephalosporin)',
    activeIngredient: 'Cephalosporin (Cefuroxime / Cefixime / Cephalexin)',
    allergyGroup: 'beta_lactam',
    hepatotoxicRisk: 'low',
    nephrotoxicRisk: 'moderate',
    giBleedingRisk: 'low',
    foodInstruction: 'Uống sau ăn 15-30 phút, uống đủ liều và đủ ngày theo phác đồ kháng sinh.',
  },
  {
    key: 'MACROLIDE',
    patterns: [/azithromycin/i, /zithromax/i, /clarithromycin/i, /klacid/i, /erythromycin/i],
    drugClass: 'Kháng sinh nhóm Macrolide',
    activeIngredient: 'Macrolide (Azithromycin / Clarithromycin)',
    allergyGroup: 'macrolide',
    hepatotoxicRisk: 'moderate',
    nephrotoxicRisk: 'low',
    giBleedingRisk: 'low',
    foodInstruction: 'Uống 1 lần/ngày, cách xa thuốc kháng axit dạ dày (Antacid) ít nhất 2 giờ.',
  },
  {
    key: 'PPI',
    patterns: [/omeprazol/i, /esomeprazol/i, /nexium/i, /pantoprazol/i, /rabeprazol/i, /lansoprazol/i],
    drugClass: 'Ức chế bơm Proton (PPI - Bảo vệ dạ dày)',
    activeIngredient: 'PPI (Omeprazole / Esomeprazole / Pantoprazole)',
    hepatotoxicRisk: 'low',
    nephrotoxicRisk: 'low',
    giBleedingRisk: 'low',
    foodInstruction: 'BẮT BUỘC uống TRƯỚC bữa ăn 30 phút (lúc bụng đói).',
  },
  {
    key: 'ANTACID',
    patterns: [/phosphalugel/i, /yumangel/i, /gaviscon/i, /maalox/i, /aluminum/i, /antacid/i],
    drugClass: 'Trung hòa axit & Bọc niêm mạc dạ dày (Antacid)',
    activeIngredient: 'Antacid (Aluminum phosphate / Alginate)',
    hepatotoxicRisk: 'low',
    nephrotoxicRisk: 'low',
    giBleedingRisk: 'low',
    foodInstruction: 'Uống sau ăn 1-2 giờ hoặc khi đau; uống CÁCH XA các thuốc khác tối thiểu 2 giờ.',
  },
  {
    key: 'METFORMIN',
    patterns: [/metformin/i, /glucophage/i],
    drugClass: 'Hạ đường huyết nhóm Biguanide',
    activeIngredient: 'Metformin',
    hepatotoxicRisk: 'low',
    nephrotoxicRisk: 'high',
    giBleedingRisk: 'low',
    foodInstruction: 'Uống ngay trong hoặc cuối bữa ăn để giảm tác dụng phụ tiêu hóa.',
  },
  {
    key: 'STATIN',
    patterns: [/atorvastatin/i, /lipitor/i, /rosuvastatin/i, /crestor/i, /simvastatin/i],
    drugClass: 'Hạ mỡ máu nhóm Statin',
    activeIngredient: 'Statin (Atorvastatin / Rosuvastatin)',
    hepatotoxicRisk: 'high',
    nephrotoxicRisk: 'low',
    giBleedingRisk: 'low',
    foodInstruction: 'Uống 1 viên vào buổi tối.',
  },
  {
    key: 'ANTIHYPERTENSIVE_ACE_ARB',
    patterns: [/losartan/i, /perindopril/i, /coversyl/i, /enalapril/i, /valsartan/i, /telmisartan/i, /captopril/i],
    drugClass: 'Hạ huyết áp nhóm Ức chế men chuyển / Chẹn thụ thể (ACEi/ARB)',
    activeIngredient: 'ACEi/ARB (Losartan / Perindopril / Enalapril)',
    hepatotoxicRisk: 'low',
    nephrotoxicRisk: 'moderate',
    giBleedingRisk: 'low',
    foodInstruction: 'Uống cố định vào buổi sáng hàng ngày.',
  },
  {
    key: 'CCB',
    patterns: [/amlodipin/i, /norvasc/i, /nifedipin/i, /felodipin/i],
    drugClass: 'Hạ huyết áp nhóm Chẹn kênh Calci (CCB)',
    activeIngredient: 'Amlodipine',
    hepatotoxicRisk: 'low',
    nephrotoxicRisk: 'low',
    giBleedingRisk: 'low',
    foodInstruction: 'Uống 1 lần/ngày vào buổi sáng sau ăn.',
  },
];

function identifyDrugProfile(tenThuoc: string): DrugSafetyProfile | null {
  const normalized = (tenThuoc || '').trim();
  for (const profile of DRUG_SAFETY_CATALOG) {
    if (profile.patterns.some((re) => re.test(normalized))) {
      return profile;
    }
  }
  return null;
}

// ─── HELPER: TÍNH ĐIỂM TƯƠNG ĐỒNG VECTOR TRIỆU CHỨNG ────────────────────────
export function matchClinicalProtocols(input: {
  trieuChung?: string;
  chanDoanSoBo?: string;
  chanDoanXacDinh?: string;
  sinhHieu?: any;
  diUng?: string;
}) {
  // Triệu chứng là căn cứ chính; chẩn đoán (có thể là gợi ý cũ đã áp dụng) chỉ dùng khi triệu chứng không khớp phác đồ nào
  const symptomText = (input.trieuChung || '').toLowerCase().trim();
  const hasSymptomHit =
    !!symptomText &&
    MOH_CLINICAL_PROTOCOLS_KB.some((p) => p.tuKhoaTrieuChung.some((kw) => symptomText.includes(kw.toLowerCase())));
  const combinedText = hasSymptomHit
    ? symptomText
    : `${symptomText} ${input.chanDoanSoBo || ''} ${input.chanDoanXacDinh || ''}`.toLowerCase().trim();

  const hatt = Number(input.sinhHieu?.huyetApTamThu || input.sinhHieu?.huyet_ap_tam_thu || 0);
  const hattr = Number(input.sinhHieu?.huyetApTamTruong || input.sinhHieu?.huyet_ap_tam_truong || 0);
  const nhietDo = Number(input.sinhHieu?.nhietDoC || input.sinhHieu?.nhiet_do_c || input.sinhHieu?.nhietDo || 0);
  const spo2 = Number(input.sinhHieu?.spo2 || 0);

  const scored = MOH_CLINICAL_PROTOCOLS_KB.map((proto) => {
    let score = 0;
    const matchedKeywords: string[] = [];

    // 1. Keyword TF-IDF matching
    for (const kw of proto.tuKhoaTrieuChung) {
      if (combinedText.includes(kw.toLowerCase())) {
        score += 0.22;
        matchedKeywords.push(kw);
      }
    }

    // 2. Direct ICD-10 code or disease name match
    const icdCodeShort = proto.maIcd10.split(' ')[0].toLowerCase();
    if (combinedText.includes(icdCodeShort) || combinedText.includes(proto.tenBenh.toLowerCase())) {
      score += 0.45;
    }

    // 3. Vital signs clinical boosting
    if (proto.id === 'BYT_I10' && (hatt >= 140 || hattr >= 90)) {
      score += 0.35;
      matchedKeywords.push(`Huyết áp cao (${hatt}/${hattr} mmHg)`);
    }
    if ((proto.id === 'BYT_J20' || proto.id === 'BYT_A97' || proto.id === 'BYT_J00') && nhietDo >= 38.0) {
      score += 0.2;
      matchedKeywords.push(`Sốt (${nhietDo}°C)`);
    }
    if (proto.id === 'BYT_J20' && spo2 > 0 && spo2 < 96) {
      score += 0.25;
      matchedKeywords.push(`Giảm SpO2 (${spo2}%)`);
    }

    const normalizedScore = Math.min(0.98, Number((score > 0 ? 0.55 + score * 0.45 : 0.35).toFixed(2)));
    return {
      protocol: proto,
      similarityScore: normalizedScore,
      matchedSignals: matchedKeywords,
      rawScore: score,
    };
  });

  scored.sort((a, b) => b.rawScore - a.rawScore);
  // Không khớp phác đồ nào thì trả rỗng — không gợi ý bừa
  return scored.filter((s) => s.rawScore > 0).slice(0, 3);
}

// ─── HELPER: TRA DANH MỤC ICD-10 BỘ Y TẾ (TT 06/2026/TT-BYT, ~15.800 mã) ───────
const normalizeVi = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

// Cách nói dân dã (đã bỏ dấu) → mã ICD-10 tương ứng
const ICD_SYNONYMS: Array<[RegExp, string[]]> = [
  [/(di ve sinh|di ngoai|dai tien|di cau) ra mau/, ['K62.5', 'K64.9', 'R31']],
  [/phan den/, ['K92.1']],
  [/(non|oi) ra mau/, ['K92.0']],
  [/(tieu|dai) ra mau|nuoc tieu (do|co mau)/, ['R31']],
  [/tieu (buot|rat|gat)/, ['N30.0', 'N39.0']],
  [/so mui|nghet mui|hat hoi/, ['J00']],
  [/(dau|rat) hong/, ['J02.9']],
  [/\bho\b/, ['R05']],
  [/\bsot\b/, ['R50.9']],
  [/(dau|nhuc) dau/, ['R51']],
  [/chong mat|hoa mat/, ['R42']],
  [/dau bung/, ['R10.4']],
  [/dau nguc/, ['R07.4']],
  [/kho tho/, ['R06.0']],
  [/buon non|\bnon\b/, ['R11']],
  [/tieu chay|di ngoai long/, ['A09']],
  [/tao bon/, ['K59.0']],
  [/me day|may day|man ngua|\bngua\b/, ['L50.9', 'L29.9']],
  [/mat ngu|kho ngu/, ['G47.0']],
  [/dau lung/, ['M54.5']],
  [/dau khop/, ['M25.5']],
  [/met moi/, ['R53']],
];

const ICD_STOPWORDS = new Set(
  'va hoac khong xac dinh cua do o co bi la cac nhung mot khac voi tai trong ngay benh nhan thi nay hay rat'.split(' '),
);

type IcdEntry = { code: string; name: string; norm: string };
let icdIndex: IcdEntry[] | null = null;
let icdByCode: Map<string, IcdEntry>;
function getIcdIndex() {
  if (!icdIndex) {
    const raw: [string, string][] = JSON.parse(readFileSync(join(__dirname, '..', 'data', 'icd10-vn.json'), 'utf8'));
    icdIndex = raw.map(([code, name]) => ({ code, name, norm: ` ${normalizeVi(name)} ` }));
    icdByCode = new Map(icdIndex.map((e) => [e.code, e]));
  }
  return icdIndex;
}

export function suggestIcd10Codes(text: string, limit = 5): Array<{ code: string; name: string }> {
  const q = normalizeVi(text || '');
  if (!q) return [];
  const index = getIcdIndex();
  const scores = new Map<string, number>();

  // 1. Từ điển đồng nghĩa dân dã
  for (const [re, codes] of ICD_SYNONYMS) {
    if (re.test(q)) codes.forEach((c) => scores.set(c, (scores.get(c) || 0) + 10));
  }

  // 2. Khớp cụm 2 âm tiết liền nhau với tên bệnh chính thức (bắt buộc có ít nhất 1 cụm)
  const tokens = q.split(' ');
  const bigrams = tokens
    .slice(1)
    .map((t, i) => [tokens[i], t])
    .filter(([a, b]) => !(ICD_STOPWORDS.has(a) && ICD_STOPWORDS.has(b)))
    .map(([a, b]) => ` ${a} ${b} `);
  const unigrams = [...new Set(tokens.filter((t) => t.length > 1 && !ICD_STOPWORDS.has(t)))].map((t) => ` ${t} `);
  // Chương P (sơ sinh) và O (thai sản) chỉ xét khi triệu chứng có nhắc tới
  const allowP = /so sinh/.test(q);
  const allowO = /thai|san phu|chuyen da|sau de/.test(q);
  if (bigrams.length) {
    for (const e of index) {
      if ((e.code[0] === 'P' && !allowP) || (e.code[0] === 'O' && !allowO)) continue;
      const hitBigrams = bigrams.filter((b) => e.norm.includes(b)).length;
      if (!hitBigrams) continue;
      const hitUnigrams = unigrams.filter((u) => e.norm.includes(u)).length;
      scores.set(e.code, (scores.get(e.code) || 0) + hitBigrams * 3 + hitUnigrams);
    }
  }

  return [...scores.entries()]
    .filter(([code]) => icdByCode.has(code))
    .sort((a, b) => b[1] - a[1] || icdByCode.get(a[0]).name.length - icdByCode.get(b[0]).name.length)
    .slice(0, limit)
    .map(([code]) => ({ code, name: icdByCode.get(code).name }));
}

// ─── HELPER: PHÂN TÍCH ĐA CHỈ SỐ XÉT NGHIỆM & HÌNH ẢNH CẬN LÂM SÀNG ─────────
// Khoảng tham chiếu khớp mẫu nhập kết quả của phòng Xét nghiệm (XetNghiemListPage).
// keys: tên khóa CHÍNH XÁC trong ketQuaChiTiet (chữ thường); crit: ngưỡng báo động [thấp, cao].
type LabSpec = {
  keys: string[];
  label: string;
  unit: string;
  ref: (female: boolean) => [number, number];
  crit?: [number | null, number | null];
  high: string;
  low?: string;
};

const LAB_SPECS: Record<string, LabSpec> = {
  wbc: { keys: ['wbc'], label: 'Bạch cầu (WBC)', unit: 'G/L', ref: () => [4, 10], crit: [2, 30], high: 'Gợi ý phản ứng viêm hoặc nhiễm khuẩn cấp tính', low: 'Giảm bạch cầu (thường gặp trong nhiễm virus / Sốt xuất huyết)' },
  neu: { keys: ['neu_percent', 'neu'], label: 'Bạch cầu trung tính (%NEU)', unit: '%', ref: () => [40, 75], high: 'Tăng ưu thế trung tính — hướng tới nhiễm khuẩn', low: 'Giảm tỷ lệ trung tính (ưu thế Lympho trong nhiễm virus)' },
  rbc: { keys: ['rbc'], label: 'Hồng cầu (RBC)', unit: 'T/L', ref: (f) => (f ? [4.0, 5.2] : [4.5, 5.9]), high: 'Cô đặc máu hoặc đa hồng cầu', low: 'Thiếu máu' },
  hgb: { keys: ['hgb', 'hb'], label: 'Huyết sắc tố (HGB)', unit: 'g/dL', ref: (f) => (f ? [12, 16] : [13, 17]), crit: [7, 20], high: 'Cô đặc máu', low: 'Thiếu máu (cần đánh giá MCV, MCH)' },
  plt: { keys: ['plt'], label: 'Tiểu cầu (PLT)', unit: 'G/L', ref: () => [150, 450], crit: [50, 1000], high: 'Tăng tiểu cầu phản ứng', low: 'Giảm tiểu cầu — nguy cơ xuất huyết (lưu ý Sốt xuất huyết Dengue)' },
  glucose: { keys: ['glucose'], label: 'Glucose máu lúc đói', unit: 'mmol/L', ref: () => [3.9, 5.5], crit: [2.8, 25], high: 'Tăng đường huyết lúc đói (5.6 - 6.9: rối loạn đường huyết lúc đói; ≥ 7.0: gợi ý ĐTĐ, cần làm lại / HbA1c)', low: 'Hạ đường huyết' },
  hba1c: { keys: ['hba1c'], label: 'HbA1c', unit: '%', ref: () => [0, 5.6], high: '5.7 - 6.4%: tiền ĐTĐ; ≥ 6.5%: đạt tiêu chuẩn chẩn đoán ĐTĐ' },
  ast: { keys: ['ast', 'got'], label: 'Men gan AST (GOT)', unit: 'U/L', ref: (f) => (f ? [0, 35] : [0, 40]), high: 'Tổn thương tế bào gan (thận trọng thuốc chuyển hóa qua gan)' },
  alt: { keys: ['alt', 'gpt'], label: 'Men gan ALT (GPT)', unit: 'U/L', ref: (f) => (f ? [0, 35] : [0, 41]), high: 'Tăng men gan — hạn chế Paracetamol liều cao, thận trọng Statin' },
  ure: { keys: ['urea', 'ure'], label: 'Ure máu', unit: 'mmol/L', ref: () => [2.5, 7.5], high: 'Tăng ure máu (mất nước hoặc suy giảm chức năng thận)', low: 'Giảm nhẹ (ăn ít đạm, bệnh gan)' },
  creatinin: { keys: ['creatinine', 'creatinin'], label: 'Creatinine huyết thanh', unit: 'µmol/L', ref: (f) => (f ? [44, 97] : [62, 115]), crit: [null, 354], high: 'Suy giảm mức lọc cầu thận — thận trọng NSAIDs, Metformin, kháng sinh thải qua thận', low: 'Giảm khối cơ' },
  cholesterol: { keys: ['cholesterol_total', 'cholesterol'], label: 'Cholesterol toàn phần', unit: 'mmol/L', ref: () => [0, 5.2], high: 'Tăng Cholesterol máu' },
  triglycerid: { keys: ['triglyceride', 'triglycerid'], label: 'Triglyceride', unit: 'mmol/L', ref: () => [0, 1.7], crit: [null, 11.3], high: 'Tăng Triglyceride máu (> 11.3: nguy cơ viêm tụy cấp)' },
  ldl: { keys: ['ldl_c', 'ldl'], label: 'LDL-C', unit: 'mmol/L', ref: () => [0, 3.4], high: 'Tăng LDL-C — tăng nguy cơ xơ vữa động mạch' },
  hdl: { keys: ['hdl_c', 'hdl'], label: 'HDL-C', unit: 'mmol/L', ref: (f) => [f ? 1.3 : 1.0, Infinity], high: '', low: 'HDL-C thấp — tăng nguy cơ tim mạch' },
  natri: { keys: ['sodium', 'natri', 'na'], label: 'Natri (Na+)', unit: 'mmol/L', ref: () => [135, 145], crit: [120, 160], high: 'Tăng Natri máu (mất nước)', low: 'Hạ Natri máu' },
  kali: { keys: ['potassium', 'kali', 'k'], label: 'Kali (K+)', unit: 'mmol/L', ref: () => [3.5, 5.1], crit: [2.8, 6.2], high: 'Tăng Kali máu — nguy cơ rối loạn nhịp tim', low: 'Hạ Kali máu — nguy cơ rối loạn nhịp tim, yếu cơ' },
  crp: { keys: ['crp'], label: 'CRP định lượng', unit: 'mg/L', ref: () => [0, 5], high: 'Tăng CRP — chỉ dấu viêm / nhiễm khuẩn đang hoạt động' },
};

const LAB_KEY_INDEX = new Map(
  Object.entries(LAB_SPECS).flatMap(([code, spec]) => spec.keys.map((k) => [k, code] as [string, string])),
);

// Xét nghiệm nước tiểu / phân có khóa trùng tên (WBC, RBC, Glucose…) nhưng không phải chỉ số máu
const isNonBloodSample = (maDichVu: string | undefined, tenDv: string) =>
  ['XN004', 'XN010'].includes(maDichVu || '') || /nước tiểu|xét nghiệm phân|soi phân/.test(tenDv);

const IMAGING_ABNORMAL =
  /(^|\s)(viêm|đông đặc|mờ|tràn dịch|tràn khí|sỏi|dày thành|khối|nốt|nang|u|nhồi máu|loạn nhịp|rung nhĩ|cuồng nhĩ|nhiễm mỡ|giãn|ứ nước|hẹp|hở van|phì đại|tổn thương|bất thường|thoái hóa|bi-rads [345])(?=\s|[,.;:]|$)/i;

function ageInYears(ngaySinh?: string): number | null {
  if (!ngaySinh) return null;
  const dob = new Date(ngaySinh).getTime();
  if (isNaN(dob)) return null;
  return Math.floor((Date.now() - dob) / (365.25 * 24 * 3600 * 1000));
}

export function analyzeClinicalLabsAndImaging(input: {
  dsXetNghiem: Array<{
    id?: number;
    maDichVu?: string;
    tenDichVu: string;
    loai?: string;
    trangThai?: string;
    giaTri?: string;
    donVi?: string;
    ketQuaChiTiet?: any;
    nhanXet?: string;
    tepDinhKem?: any;
  }>;
  benhNhan?: { hoTen?: string; gioiTinh?: string; ngaySinh?: string; diUng?: string };
  sinhHieu?: any;
}) {
  const abnormalBiomarkers: Array<{
    chiSo: string;
    giaTri: string;
    khoangThamChieu: string;
    mucDo: 'tang_cao' | 'giam_thap' | 'nguy_kich';
    huong: 'cao' | 'thap';
    yNghiaLamSang: string;
  }> = [];

  const imagingFindings: Array<{
    tenDichVu: string;
    phatHien: string;
    mucDo: 'binh_thuong' | 'bat_thuong';
    khuyenNghi: string;
  }> = [];

  const isFemale = input.benhNhan?.gioiTinh === 'nu';
  const age = ageInYears(input.benhNhan?.ngaySinh);
  const values: Record<string, number> = {};
  let analyzedCount = 0;
  let pendingCount = 0;

  for (const item of input.dsXetNghiem || []) {
    const tenDv = (item.tenDichVu || '').toLowerCase();
    let chiTietObj: Record<string, any> = {};
    if (item.ketQuaChiTiet && typeof item.ketQuaChiTiet === 'object') {
      chiTietObj = item.ketQuaChiTiet;
    } else if (typeof item.ketQuaChiTiet === 'string') {
      try {
        const parsed = JSON.parse(item.ketQuaChiTiet);
        if (parsed && typeof parsed === 'object') chiTietObj = parsed;
      } catch {}
    }
    const filled = Object.entries(chiTietObj).filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== '');
    if (!filled.length && !item.giaTri && !item.nhanXet) {
      pendingCount++;
      continue;
    }

    const isImaging =
      item.loai === 'chan_doan_hinh_anh' ||
      /x-quang|x quang|siêu âm|điện tim|điện tâm đồ|ecg|nội soi|ct |mri/.test(tenDv);

    if (isImaging) {
      const conclusion = String(chiTietObj.Conclusion || item.nhanXet || item.giaTri || '').trim();
      const phatHien = conclusion || filled.map(([k, v]) => `${k}: ${v}`).join('; ');
      // Bỏ các cụm phủ định ("không thấy sỏi", "chưa phát hiện tổn thương") trước khi tìm từ khóa bất thường
      const abnormal = IMAGING_ABNORMAL.test(phatHien.toLowerCase().replace(/(không|chưa)[^,;.\n]*/g, ' '));
      imagingFindings.push({
        tenDichVu: item.tenDichVu,
        phatHien,
        mucDo: abnormal ? 'bat_thuong' : 'binh_thuong',
        khuyenNghi: abnormal
          ? 'Có dấu hiệu bất thường trên hình ảnh học, cần đối chiếu triệu chứng lâm sàng.'
          : 'Chưa ghi nhận bất thường trên kết luận hình ảnh.',
      });
      continue;
    }
    if (isNonBloodSample(item.maDichVu, tenDv)) continue;

    for (const [rawKey, rawVal] of filled) {
      const code = LAB_KEY_INDEX.get(rawKey.toLowerCase());
      if (!code) continue;
      const numMatch = String(rawVal).replace(',', '.').match(/-?\d+(\.\d+)?/);
      if (!numMatch) continue;
      let num = parseFloat(numMatch[0]);
      if (code === 'hgb' && num > 30) num = Math.round(num) / 10; // nhập theo g/L → đổi sang g/dL
      values[code] = num;
      analyzedCount++;

      const spec = LAB_SPECS[code];
      const [min, max] = spec.ref(isFemale);
      const [critLow, critHigh] = spec.crit || [null, null];
      const huong = num > max ? 'cao' : num < min ? 'thap' : null;
      if (!huong) continue;
      const critical = (critLow !== null && num < critLow) || (critHigh !== null && num > critHigh);
      abnormalBiomarkers.push({
        chiSo: spec.label,
        giaTri: `${num} ${spec.unit}`,
        khoangThamChieu:
          max === Infinity ? `> ${min} ${spec.unit}` : min === 0 ? `< ${max} ${spec.unit}` : `${min} - ${max} ${spec.unit}`,
        mucDo: critical ? 'nguy_kich' : huong === 'cao' ? 'tang_cao' : 'giam_thap',
        huong,
        yNghiaLamSang: huong === 'cao' ? spec.high : spec.low,
      });
    }
  }

  const derivedIndices: Array<{ tenChiSo: string; giaTri: string; danhGia: string }> = [];

  // eGFR theo CKD-EPI 2021 (KDIGO khuyến nghị) — chỉ áp dụng người ≥ 18 tuổi có ngày sinh
  const creatinine = values.creatinin;
  if (creatinine > 0 && age !== null && age >= 18) {
    const scr = creatinine / 88.4;
    const kappa = isFemale ? 0.7 : 0.9;
    const alpha = isFemale ? -0.241 : -0.302;
    const egfr = Math.round(
      142 *
        Math.pow(Math.min(scr / kappa, 1), alpha) *
        Math.pow(Math.max(scr / kappa, 1), -1.2) *
        Math.pow(0.9938, age) *
        (isFemale ? 1.012 : 1),
    );
    derivedIndices.push({
      tenChiSo: 'Mức lọc cầu thận ước tính (eGFR - CKD-EPI 2021)',
      giaTri: `${egfr} mL/phút/1.73m²`,
      danhGia:
        egfr >= 90
          ? 'Bình thường (G1)'
          : egfr >= 60
          ? 'Giảm nhẹ (G2) — theo dõi định kỳ'
          : egfr >= 45
          ? 'Giảm nhẹ - trung bình (G3a) — hiệu chỉnh liều thuốc thải qua thận'
          : egfr >= 30
          ? 'Giảm trung bình - nặng (G3b) — hiệu chỉnh liều, tránh NSAIDs'
          : egfr >= 15
          ? 'Giảm nặng (G4) — tránh NSAIDs, Metformin; chuyển chuyên khoa Thận'
          : 'Suy thận (G5) — chuyển chuyên khoa Thận',
    });
  }

  const ast = values.ast;
  const alt = values.alt;
  if (ast > 0 && alt > 0) {
    const ratio = ast / alt;
    const [, astMax] = LAB_SPECS.ast.ref(isFemale);
    const [, altMax] = LAB_SPECS.alt.ref(isFemale);
    derivedIndices.push({
      tenChiSo: 'Tỷ số De Ritis (AST/ALT)',
      giaTri: ratio.toFixed(2),
      danhGia:
        ast <= astMax && alt <= altMax
          ? 'Men gan trong giới hạn bình thường'
          : ratio < 1
          ? 'Tăng men gan ưu thế ALT — gợi ý viêm gan cấp / gan nhiễm mỡ'
          : ratio >= 2
          ? 'AST/ALT ≥ 2 — gợi ý tổn thương gan do rượu'
          : 'Tăng men gan ưu thế AST — lưu ý tổn thương gan do thuốc, rượu hoặc xơ gan',
    });
  }

  const riskLevel = abnormalBiomarkers.some((b) => b.mucDo === 'nguy_kich')
    ? 'nguy_hiem_cao'
    : abnormalBiomarkers.length > 0 || imagingFindings.some((i) => i.mucDo === 'bat_thuong')
    ? 'can_theo_doi'
    : 'binh_thuong';

  const summaryLines: string[] = [];
  if (abnormalBiomarkers.length > 0) {
    summaryLines.push(
      `Phát hiện ${abnormalBiomarkers.length} chỉ số ngoài khoảng tham chiếu: ${abnormalBiomarkers
        .map((b) => `${b.chiSo} (${b.giaTri}${b.mucDo === 'nguy_kich' ? ' — NGƯỠNG BÁO ĐỘNG' : ''})`)
        .join(', ')}.`,
    );
  } else if (analyzedCount > 0) {
    summaryLines.push('Các chỉ số xét nghiệm đã có kết quả nằm trong khoảng tham chiếu.');
  }
  if (imagingFindings.length > 0) {
    summaryLines.push(`Hình ảnh học: ${imagingFindings.map((f) => `${f.tenDichVu} (${f.phatHien})`).join('; ')}.`);
  }
  if (pendingCount > 0) summaryLines.push(`Còn ${pendingCount} chỉ định chưa có kết quả.`);

  return {
    riskLevel,
    totalAnalyzedServices: (input.dsXetNghiem || []).length - pendingCount,
    abnormalBiomarkers,
    imagingFindings,
    derivedIndices,
    clinicalConclusion: summaryLines.join(' ') || 'Chưa có kết quả cận lâm sàng để phân tích.',
  };
}

// ─── 3. ENGINE KIỂM DUYỆT TƯƠNG TÁC THUỐC, DỊ ỨNG & CHỨC NĂNG GAN THẬN ──────
export function evaluatePrescriptionSafety(input: {
  medications: Array<{
    thuocId?: number;
    tenThuoc: string;
    lieuDung?: string;
    soLuong?: number;
    soNgayDung?: number;
  }>;
  patientContext?: {
    hoTen?: string;
    tuoi?: number;
    canNangKg?: number;
    diUng?: string;
    chanDoan?: string;
    huyetApTamThu?: number;
    huyetApTamTruong?: number;
    ast?: number;
    alt?: number;
    creatinine?: number;
    plt?: number;
  };
}) {
  const meds = input.medications || [];
  const ctx = input.patientContext || {};
  const diUngText = (ctx.diUng || '').toLowerCase();
  const chanDoanText = (ctx.chanDoan || '').toLowerCase();

  const alerts: Array<{
    loaiCanhBao: 'DI_UNG' | 'TUONG_TAC_THUOC' | 'CHUC_Nang_GAN_THAN' | 'BENH_LY_NEN' | 'TRUNG_LAP_NHOM' | 'HUONG_DAN_UONG';
    mucDo: 'nghiem_trong' | 'trung_binh' | 'luu_y';
    tieuDe: string;
    moTaChiTiet: string;
    khuyenNghiXuTri: string;
    thuocLienQuan: string[];
  }> = [];

  const identified = meds.map((m) => ({
    ...m,
    profile: identifyDrugProfile(m.tenThuoc),
  }));

  // 1. KIỂM TRA DỊ ỨNG THUỐC & DỊ ỨNG CHÉO (DRUG-ALLERGY CROSS-REACTIVITY)
  if (diUngText && diUngText !== 'không' && diUngText !== 'khong') {
    for (const item of identified) {
      const nameLower = item.tenThuoc.toLowerCase();
      const prof = item.profile;

      const isDirectMatch =
        diUngText.split(/[,;]/).some((tok) => tok.trim().length >= 3 && nameLower.includes(tok.trim()));

      const isBetaLactamCross =
        (diUngText.includes('penicillin') ||
          diUngText.includes('amoxicillin') ||
          diUngText.includes('beta-lactam') ||
          diUngText.includes('kháng sinh')) &&
        prof?.allergyGroup === 'beta_lactam';

      const isNsaidCross =
        (diUngText.includes('nsaid') ||
          diUngText.includes('ibuprofen') ||
          diUngText.includes('aspirin') ||
          diUngText.includes('giảm đau')) &&
        prof?.allergyGroup === 'nsaid';

      if (isDirectMatch || isBetaLactamCross || isNsaidCross) {
        alerts.push({
          loaiCanhBao: 'DI_UNG',
          mucDo: 'nghiem_trong',
          tieuDe: `🚨 CẢNH BÁO DỊ ỨNG / PHẢN ỨNG CHÉO: ${item.tenThuoc}`,
          moTaChiTiet: `Bệnh nhân có tiền sử dị ứng ghi nhận: "${ctx.diUng}". Thuốc "${item.tenThuoc}" (${
            prof?.drugClass || 'Hoạt chất tương ứng'
          }) có nguy cơ cao gây phản ứng quá mẫn hoặc sốc phản vệ chéo.`,
          khuyenNghiXuTri:
            prof?.allergyGroup === 'beta_lactam'
              ? 'Ngưng kê nhóm Beta-lactam (Amoxicillin/Cephalosporin); cân nhắc đổi sang kháng sinh nhóm Macrolide (Azithromycin 500mg).'
              : 'Thay thế bằng nhóm hoạt chất khác không có phản ứng chéo.',
          thuocLienQuan: [item.tenThuoc],
        });
      }
    }
  }

  // 2. KIỂM TRA TRÙNG LẶP HOẠT CHẤT / CÙNG NHÓM DƯỢC LÝ (DUPLICATE THERAPY)
  const groupMap: Record<string, string[]> = {};
  for (const item of identified) {
    if (!item.profile) continue;
    const gk = item.profile.key;
    if (!groupMap[gk]) groupMap[gk] = [];
    groupMap[gk].push(item.tenThuoc);
  }

  for (const [gk, listNames] of Object.entries(groupMap)) {
    if (listNames.length > 1) {
      alerts.push({
        loaiCanhBao: 'TRUNG_LAP_NHOM',
        mucDo: 'nghiem_trong',
        tieuDe: `⚠️ Trùng lặp nhóm dược lý (${gk}): ${listNames.join(' + ')}`,
        moTaChiTiet: `Đơn thuốc đang có ${listNames.length} thuốc cùng nhóm hoạt chất (${listNames.join(
          ', ',
        )}), làm tăng nguy cơ quá liều và độc tính cộng gộp trên gan/thận/dạ dày.`,
        khuyenNghiXuTri: `Chỉ giữ lại 1 thuốc đại diện trong nhóm (${listNames[0]}) và loại bỏ thuốc trùng lặp.`,
        thuocLienQuan: listNames,
      });
    }
  }

  // 3. KIỂM TRA TƯƠNG TÁC THUỐC - THUỐC (DRUG-DRUG INTERACTIONS - DDI)
  const hasNsaid = Boolean(groupMap['NSAID']?.length || groupMap['ASPIRIN']?.length);
  const hasCorticoid = Boolean(groupMap['CORTICOID']?.length);
  const hasPpi = Boolean(groupMap['PPI']?.length);
  const hasAntacid = Boolean(groupMap['ANTACID']?.length);
  const hasAceArb = Boolean(groupMap['ANTIHYPERTENSIVE_ACE_ARB']?.length);
  const hasMacrolide = Boolean(groupMap['MACROLIDE']?.length);
  const hasStatin = Boolean(groupMap['STATIN']?.length);
  const hasOralAntibiotic = Boolean(
    groupMap['PENICILLIN_BETA_LACTAM']?.length ||
      groupMap['CEPHALOSPORIN']?.length ||
      groupMap['MACROLIDE']?.length,
  );

  // DDI 1: NSAID + Corticoid
  if (hasNsaid && hasCorticoid) {
    const involved = [...(groupMap['NSAID'] || []), ...(groupMap['ASPIRIN'] || []), ...(groupMap['CORTICOID'] || [])];
    alerts.push({
      loaiCanhBao: 'TUONG_TAC_THUOC',
      mucDo: 'nghiem_trong',
      tieuDe: '🚨 Tương tác Nghiêm trọng: NSAID + Corticosteroid (Nguy cơ xuất huyết tiêu hóa)',
      moTaChiTiet: `Phối hợp cùng lúc ${involved.join(' và ')} làm tăng gấp 4 - 6 lần nguy cơ viêm loét và xuất huyết dạ dày - tá tràng cấp tính.`,
      khuyenNghiXuTri:
        'Tránh phối hợp đồng thời NSAID với Corticoid (thay NSAID bằng Paracetamol 500mg), hoặc bắt buộc kê kèm thuốc bảo vệ dạ dày PPI (Omeprazole 20mg).',
      thuocLienQuan: involved,
    });
  }

  // DDI 2: NSAID hoặc Corticoid chưa có PPI bảo vệ dạ dày
  if ((hasNsaid || hasCorticoid) && !hasPpi) {
    const involved = [...(groupMap['NSAID'] || []), ...(groupMap['CORTICOID'] || [])];
    alerts.push({
      loaiCanhBao: 'TUONG_TAC_THUOC',
      mucDo: 'trung_binh',
      tieuDe: '🛡️ Khuyến nghị Bảo vệ Niêm mạc Dạ dày khi dùng NSAID / Corticoid',
      moTaChiTiet: `Đơn thuốc có chứa thuốc gây kích ứng niêm mạc dạ dày (${involved.join(', ')}) nhưng chưa có thuốc ức chế bơm proton (PPI).`,
      khuyenNghiXuTri: 'Nên bổ sung Omeprazole 20mg (uống trước ăn sáng 30 phút) để dự phòng viêm trợt dạ dày.',
      thuocLienQuan: involved,
    });
  }

  // DDI 3: NSAID + Thuốc hạ áp ACEi/ARB
  if (hasNsaid && hasAceArb) {
    const involved = [...(groupMap['NSAID'] || []), ...(groupMap['ANTIHYPERTENSIVE_ACE_ARB'] || [])];
    alerts.push({
      loaiCanhBao: 'TUONG_TAC_THUOC',
      mucDo: 'trung_binh',
      tieuDe: '⚠️ Tương tác Thuốc: NSAID + Thuốc hạ áp (ACEi/ARB)',
      moTaChiTiet: `${involved.join(' + ')}: NSAID làm co tiểu động mạch đến cầu thận, làm giảm hiệu quả hạ huyết áp của nhóm ACEi/ARB và tăng nguy cơ suy thận cấp.`,
      khuyenNghiXuTri: 'Ưu tiên dùng Paracetamol để giảm đau ở bệnh nhân đang điều trị Tăng huyết áp, và theo dõi sát huyết áp + Creatinine.',
      thuocLienQuan: involved,
    });
  }

  // DDI 4: Kháng sinh Macrolide + Statin
  if (hasMacrolide && hasStatin) {
    const involved = [...(groupMap['MACROLIDE'] || []), ...(groupMap['STATIN'] || [])];
    alerts.push({
      loaiCanhBao: 'TUONG_TAC_THUOC',
      mucDo: 'nghiem_trong',
      tieuDe: '🚨 Tương tác Chuyển hóa CYP3A4: Kháng sinh Macrolide + Statin',
      moTaChiTiet: `Kháng sinh Macrolide ức chế enzym CYP3A4 tại gan làm tăng nồng độ Statin trong máu, dẫn đến nguy cơ đau cơ và tiêu cơ vân cấp.`,
      khuyenNghiXuTri: 'Tạm ngưng thuốc hạ mỡ máu Statin trong 5-7 ngày đang uống đợt kháng sinh Macrolide.',
      thuocLienQuan: involved,
    });
  }

  // DDI 5: Antacid bọc dạ dày + Kháng sinh đường uống
  if (hasAntacid && hasOralAntibiotic) {
    const involved = [
      ...(groupMap['ANTACID'] || []),
      ...(groupMap['PENICILLIN_BETA_LACTAM'] || []),
      ...(groupMap['CEPHALOSPORIN'] || []),
      ...(groupMap['MACROLIDE'] || []),
    ];
    alerts.push({
      loaiCanhBao: 'HUONG_DAN_UONG',
      mucDo: 'luu_y',
      tieuDe: '⏰ Tương tác Hấp thu: Thuốc bọc dạ dày (Antacid) + Kháng sinh',
      moTaChiTiet: `Các muối Nhôm/Magie trong Antacid tạo phức chelat làm giảm 40-60% khả năng hấp thu của kháng sinh nếu uống cùng lúc.`,
      khuyenNghiXuTri: 'Hướng dẫn bệnh nhân uống thuốc bọc dạ dày CÁCH XA thời điểm uống kháng sinh ít nhất 2 giờ.',
      thuocLienQuan: involved,
    });
  }

  // 4. KIỂM TRA THEO CHẨN ĐOÁN BỆNH NỀN & CHỨC NĂNG GAN / THẬN / SINH HIỆU
  // 4a. Viêm loét dạ dày (K29) hoặc Sốt xuất huyết (A97) mà kê NSAID/Aspirin/Corticoid
  if ((chanDoanText.includes('k29') || chanDoanText.includes('dạ dày') || chanDoanText.includes('bao tử')) && (hasNsaid || hasCorticoid)) {
    const involved = [...(groupMap['NSAID'] || []), ...(groupMap['ASPIRIN'] || []), ...(groupMap['CORTICOID'] || [])];
    alerts.push({
      loaiCanhBao: 'BENH_LY_NEN',
      mucDo: 'nghiem_trong',
      tieuDe: '🚨 Chống chỉ định trên Bệnh lý Dạ dày - Tá tràng',
      moTaChiTiet: `Bệnh nhân đang có chẩn đoán "${ctx.chanDoan}" nhưng đơn thuốc có ${involved.join(', ')} gây phá hủy hàng rào nhầy bảo vệ dạ dày.`,
      khuyenNghiXuTri: 'Loại bỏ NSAID/Corticoid khỏi đơn thuốc của bệnh nhân viêm loét dạ dày.',
      thuocLienQuan: involved,
    });
  }

  if ((chanDoanText.includes('a97') || chanDoanText.includes('sốt xuất huyết') || (ctx.plt && ctx.plt < 140)) && (hasNsaid || hasCorticoid)) {
    const involved = [...(groupMap['NSAID'] || []), ...(groupMap['ASPIRIN'] || []), ...(groupMap['CORTICOID'] || [])];
    alerts.push({
      loaiCanhBao: 'BENH_LY_NEN',
      mucDo: 'nghiem_trong',
      tieuDe: '🚨 CHỐNG CHỈ ĐỊNH TUYỆT ĐỐI: NSAID/Aspirin trên bệnh nhân Sốt xuất huyết / Giảm tiểu cầu',
      moTaChiTiet: `Theo QĐ 2760/QĐ-BYT, việc dùng ${involved.join(', ')} ở bệnh nhân Sốt xuất huyết hoặc giảm tiểu cầu gây ức chế kết tập tiểu cầu và xuất huyết nội tạng nguy kịch.`,
      khuyenNghiXuTri: 'Chỉ sử dụng đơn chất Paracetamol 500mg để hạ sốt.',
      thuocLienQuan: involved,
    });
  }

  // 4b. Tăng men gan (AST/ALT > 60 U/L)
  if ((ctx.ast && ctx.ast > 60) || (ctx.alt && ctx.alt > 60)) {
    const hepatotoxicMeds = identified.filter((i) => i.profile?.hepatotoxicRisk === 'high').map((i) => i.tenThuoc);
    if (hepatotoxicMeds.length > 0) {
      alerts.push({
        loaiCanhBao: 'CHUC_Nang_GAN_THAN',
        mucDo: 'trung_binh',
        tieuDe: `⚠️ Cảnh báo Chức năng Gan (AST: ${ctx.ast || '--'} U/L, ALT: ${ctx.alt || '--'} U/L)`,
        moTaChiTiet: `Bệnh nhân có chỉ số men gan tăng cao. Thuốc ${hepatotoxicMeds.join(', ')} chuyển hóa mạnh qua gan.`,
        khuyenNghiXuTri: 'Giảm tổng liều Paracetamol (< 2g/ngày) hoặc tạm hoãn nhóm Statin cho đến khi men gan ổn định.',
        thuocLienQuan: hepatotoxicMeds,
      });
    }
  }

  // 4c. Suy giảm chức năng thận (Creatinine > 115 µmol/L)
  if (ctx.creatinine && ctx.creatinine > 115) {
    const nephrotoxicMeds = identified
      .filter((i) => i.profile?.nephrotoxicRisk === 'high' || i.profile?.nephrotoxicRisk === 'moderate')
      .map((i) => i.tenThuoc);
    if (nephrotoxicMeds.length > 0) {
      alerts.push({
        loaiCanhBao: 'CHUC_Nang_GAN_THAN',
        mucDo: 'nghiem_trong',
        tieuDe: `🚨 Cảnh báo Chức năng Thận (Creatinine: ${ctx.creatinine} µmol/L)`,
        moTaChiTiet: `Bệnh nhân có suy giảm độ thanh thải thận. Các thuốc ${nephrotoxicMeds.join(', ')} có nguy cơ tích lũy liều hoặc gây độc thận.`,
        khuyenNghiXuTri: 'Tránh dùng NSAIDs; hiệu chỉnh giảm 50% liều kháng sinh Cephalosporin / Metformin theo mức lọc cầu thận eGFR.',
        thuocLienQuan: nephrotoxicMeds,
      });
    }
  }

  // Tính điểm an toàn đơn thuốc (Safety Score: 0 -> 100)
  let penalty = 0;
  for (const a of alerts) {
    if (a.mucDo === 'nghiem_trong') penalty += 35;
    else if (a.mucDo === 'trung_binh') penalty += 15;
    else penalty += 5;
  }
  const safetyScore = Math.max(15, 100 - penalty);
  const safetyStatus =
    alerts.some((a) => a.mucDo === 'nghiem_trong')
      ? 'nguy_hiem_cao'
      : alerts.some((a) => a.mucDo === 'trung_binh')
      ? 'can_than_trong'
      : 'an_toan';

  // Tổng hợp hướng dẫn dùng thuốc chuẩn Dược lâm sàng tự động cho lời dặn bác sĩ
  const autoInstructions = identified
    .filter((i) => i.profile?.foodInstruction)
    .map((i) => `• ${i.tenThuoc}: ${i.profile?.foodInstruction}`);

  return {
    safetyScore,
    safetyStatus,
    totalMedications: meds.length,
    alerts,
    medicationProfiles: identified.map((i) => ({
      tenThuoc: i.tenThuoc,
      lieuDung: i.lieuDung,
      soLuong: i.soLuong,
      nhomDuocLy: i.profile?.drugClass || 'Thuốc điều trị chuyên khoa',
      hoatChat: i.profile?.activeIngredient || i.tenThuoc,
      huongDanDungChuan: i.profile?.foodInstruction || 'Uống theo chỉ định của bác sĩ.',
    })),
    recommendedDoctorNote:
      autoInstructions.length > 0
        ? `${autoInstructions.join(' ')} Kiêng rượu bia, tái khám đúng hẹn.`
        : 'Uống thuốc đúng liều lượng sau bữa ăn, uống nhiều nước ấm và tái khám đúng hẹn.',
  };
}

