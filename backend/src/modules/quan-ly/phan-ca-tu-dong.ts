/**
 * Phân ca tự động theo nhu cầu (heuristic có ràng buộc + chấm điểm), không phụ thuộc DB để dễ kiểm thử.
 *
 * 1. Nhu cầu: số bác sĩ cần cho mỗi (ngày, ca, chuyên khoa) = dự báo bệnh nhân / công suất bác sĩ,
 *    không thấp hơn mức phủ tối thiểu; nhân sự hỗ trợ theo số bệnh nhân của ca.
 * 2. Ràng buộc cứng: nghỉ phép, ≤ giờ tối đa/tuần, ≤ số ngày làm/tuần, nghỉ ≥ N giờ giữa 2 ngày,
 *    ≤ 3 ca/ngày, giữ ca đã cố định (ca có bệnh nhân đặt lịch, ca đang có khi không ghi đè).
 * 3. Chọn người: vị trí khan hiếm xếp trước; điểm ưu tiên người ít giờ, ít ca tối/Chủ nhật (cả lịch sử).
 * 4. Cân bằng: chuyển ca từ người nhiều giờ nhất sang người ít giờ nhất cùng nhóm khi hợp lệ.
 */

export type NhomNhanSu = 'bac_si' | 'tiep_tan' | 'thu_ngan' | 'nha_thuoc' | 'ky_thuat_vien';

export const TEN_NHOM: Record<NhomNhanSu, string> = {
  bac_si: 'Bác sĩ',
  tiep_tan: 'Lễ tân',
  thu_ngan: 'Thu ngân',
  nha_thuoc: 'Dược',
  ky_thuat_vien: 'Kỹ thuật viên',
};

export interface CaXep {
  id: number;
  tenCa: string;
  batDau: number; // phút trong ngày
  ketThuc: number;
}

export interface NhanSuXep {
  id: number;
  hoTen: string;
  nhom: NhomNhanSu;
  chuyenKhoa?: string;
  /** Số ca tối / Chủ nhật đã làm 4 tuần trước — để xoay vòng công bằng giữa các tuần */
  caKhoLichSu: number;
}

export interface CaCoDinh {
  nhanVienId: number;
  caId: number;
  ngay: string;
  ghiChu: string;
}

export interface NhuCau {
  ngay: string;
  caId: number;
  nhom: NhomNhanSu;
  /** Chỉ với bác sĩ: chuyên khoa cần (null = bác sĩ bất kỳ) */
  chuyenKhoa: string | null;
  can: number;
  duBaoBn: number;
  lyDo: string;
}

export interface ThamSoXep {
  gioToiDaTuan: number;
  soNgayLamToiDa: number;
  gioNghiToiThieu: number;
  soCaToiDaNgay: number;
}

export interface CaDeXuat {
  nhanVienId: number;
  caLamViecId: number;
  ngayLam: string;
  ghiChu: string;
  coDinh: boolean;
}

const caKho = (ca: CaXep, ngayIdx: number, dsCa: CaXep[]) => ngayIdx === 6 || dsCa.indexOf(ca) >= 2;

export const chuanHoaKhoa = (s?: string | null) =>
  (s || '').normalize('NFC').toLowerCase().replace(/^(khoa|chuyên khoa)\s+/, '').trim();

/** Bác sĩ thuộc chuyên khoa (so khớp lỏng như màn hình đặt lịch) */
export const dungKhoa = (bsKhoa?: string, khoa?: string | null) => {
  const a = chuanHoaKhoa(bsKhoa);
  const b = chuanHoaKhoa(khoa);
  return !!a && !!b && (a.includes(b) || b.includes(a));
};

export function xepLich(input: {
  ngay: string[];
  dsCa: CaXep[];
  nhanSu: NhanSuXep[];
  nghi: Set<string>; // `${nhanVienId}_${ngay}`
  coDinh: CaCoDinh[];
  nhuCau: NhuCau[];
  thamSo: ThamSoXep;
}) {
  const { ngay, dsCa, nhanSu, nghi, coDinh, nhuCau, thamSo } = input;
  const caTheoId = new Map(dsCa.map((c) => [c.id, c]));
  const ngayIdx = new Map(ngay.map((d, i) => [d, i]));

  // Lịch của từng người: ngày → các ca
  const lich = new Map<number, Map<string, CaXep[]>>();
  const ketQua: CaDeXuat[] = [];
  const caCua = (nvId: number, d: string) => lich.get(nvId)?.get(d) || [];
  const phutTuan = (nvId: number) =>
    [...(lich.get(nvId)?.values() || [])].flat().reduce((s, c) => s + c.ketThuc - c.batDau, 0);
  const soCaKhoTuan = (nvId: number) =>
    [...(lich.get(nvId)?.entries() || [])].reduce(
      (s, [d, ds]) => s + ds.filter((c) => caKho(c, ngayIdx.get(d)!, dsCa)).length, 0);

  const ghi = (nvId: number, ca: CaXep, d: string, ghiChu: string, laCoDinh: boolean) => {
    if (!lich.has(nvId)) lich.set(nvId, new Map());
    const theoNgay = lich.get(nvId)!;
    theoNgay.set(d, [...(theoNgay.get(d) || []), ca].sort((a, b) => a.batDau - b.batDau));
    ketQua.push({ nhanVienId: nvId, caLamViecId: ca.id, ngayLam: d, ghiChu, coDinh: laCoDinh });
  };
  const xoa = (nvId: number, ca: CaXep, d: string) => {
    const theoNgay = lich.get(nvId)!;
    const con = (theoNgay.get(d) || []).filter((c) => c !== ca);
    if (con.length) theoNgay.set(d, con); else theoNgay.delete(d);
    const i = ketQua.findIndex((k) => k.nhanVienId === nvId && k.caLamViecId === ca.id && k.ngayLam === d);
    if (i >= 0) ketQua.splice(i, 1);
  };

  /** Ràng buộc cứng khi thêm (ca, ngày) cho một người */
  const hopLe = (nvId: number, ca: CaXep, d: string) => {
    if (nghi.has(`${nvId}_${d}`)) return false;
    const trongNgay = caCua(nvId, d);
    if (trongNgay.some((c) => c.id === ca.id || (c.batDau < ca.ketThuc && ca.batDau < c.ketThuc))) return false;
    if (trongNgay.length >= thamSo.soCaToiDaNgay) return false;
    if (phutTuan(nvId) + ca.ketThuc - ca.batDau > thamSo.gioToiDaTuan * 60) return false;
    if (!trongNgay.length && (lich.get(nvId)?.size || 0) >= thamSo.soNgayLamToiDa) return false;
    const i = ngayIdx.get(d)!;
    const nghiPhut = thamSo.gioNghiToiThieu * 60;
    const truoc = i > 0 ? caCua(nvId, ngay[i - 1]) : [];
    if (truoc.length && 1440 - truoc[truoc.length - 1].ketThuc + Math.min(ca.batDau, trongNgay[0]?.batDau ?? ca.batDau) < nghiPhut) return false;
    const sau = i < 6 ? caCua(nvId, ngay[i + 1]) : [];
    if (sau.length && 1440 - Math.max(ca.ketThuc, trongNgay[trongNgay.length - 1]?.ketThuc ?? 0) + sau[0].batDau < nghiPhut) return false;
    return true;
  };

  /** Điểm càng thấp càng được ưu tiên */
  const diem = (nv: NhanSuXep, ca: CaXep, d: string) => {
    let s = phutTuan(nv.id) / 60;
    if (caKho(ca, ngayIdx.get(d)!, dsCa)) s += 4 * soCaKhoTuan(nv.id) + nv.caKhoLichSu;
    const soCaNgay = caCua(nv.id, d).length;
    if (soCaNgay === 1) s -= 1; // gom 2 ca vào ngày đã đi làm, bớt ngày phải đến
    if (soCaNgay >= 2) s += 12; // ca thứ 3 (làm 12 tiếng) chỉ khi không còn người khác
    return s + (nv.id % 97) / 1000; // phá hòa ổn định
  };

  // Ca cố định: giữ nguyên, tính vào giờ làm
  for (const cd of coDinh) {
    const ca = caTheoId.get(cd.caId);
    if (!ca || !ngayIdx.has(cd.ngay) || caCua(cd.nhanVienId, cd.ngay).some((c) => c.id === ca.id)) continue;
    ghi(cd.nhanVienId, ca, cd.ngay, cd.ghiChu, true);
  }

  const phuHop = (nv: NhanSuXep, nc: NhuCau) =>
    nv.nhom === nc.nhom && (nc.chuyenKhoa === null || dungKhoa(nv.chuyenKhoa, nc.chuyenKhoa));
  const daXep = (nc: NhuCau) =>
    nhanSu.filter((nv) => phuHop(nv, nc) && caCua(nv.id, nc.ngay).some((c) => c.id === nc.caId)).length;

  // Vị trí khan hiếm (ít ứng viên / nhu cầu) và ca khó xếp trước; bác sĩ đúng khoa trước bác sĩ bất kỳ
  const thuTu = [...nhuCau].sort((a, b) => {
    const kho = (n: NhuCau) => (caKho(caTheoId.get(n.caId)!, ngayIdx.get(n.ngay)!, dsCa) ? 0 : 1);
    const batKy = (n: NhuCau) => (n.nhom === 'bac_si' && n.chuyenKhoa === null ? 1 : 0);
    const khanHiem = (n: NhuCau) => nhanSu.filter((nv) => phuHop(nv, n)).length / Math.max(n.can, 1);
    return batKy(a) - batKy(b) || kho(a) - kho(b) || khanHiem(a) - khanHiem(b);
  });

  const thieu: string[] = [];
  for (const nc of thuTu) {
    const ca = caTheoId.get(nc.caId)!;
    let conThieu = nc.can - daXep(nc);
    while (conThieu > 0) {
      const ungVien = nhanSu
        .filter((nv) => phuHop(nv, nc) && hopLe(nv.id, ca, nc.ngay))
        .sort((a, b) => diem(a, ca, nc.ngay) - diem(b, ca, nc.ngay));
      if (!ungVien.length) break;
      const viTri = nc.chuyenKhoa ? `${TEN_NHOM[nc.nhom]} ${nc.chuyenKhoa}` : TEN_NHOM[nc.nhom];
      ghi(ungVien[0].id, ca, nc.ngay, `${viTri} - ${ca.tenCa}`, false);
      conThieu--;
    }
    if (conThieu > 0) {
      const viTri = nc.chuyenKhoa ? `bác sĩ ${nc.chuyenKhoa}` : TEN_NHOM[nc.nhom].toLowerCase();
      thieu.push(`${nc.ngay} ${ca.tenCa}: thiếu ${conThieu} ${viTri} (cần ${nc.can}).`);
    }
  }

  // Cân bằng giờ: chuyển ca (không cố định) từ người nhiều giờ nhất sang người ít giờ nhất cùng vị trí
  const cungViTri = (a: NhanSuXep, b: NhanSuXep) =>
    a.nhom === b.nhom && (a.nhom !== 'bac_si' || chuanHoaKhoa(a.chuyenKhoa) === chuanHoaKhoa(b.chuyenKhoa));
  for (let vong = 0; vong < 500; vong++) {
    let daChuyen = false;
    for (const nv of [...nhanSu].sort((a, b) => phutTuan(b.id) - phutTuan(a.id))) {
      const nhan = nhanSu
        .filter((x) => x.id !== nv.id && cungViTri(x, nv))
        .sort((a, b) => phutTuan(a.id) - phutTuan(b.id));
      for (const k of ketQua.filter((k) => k.nhanVienId === nv.id && !k.coDinh)) {
        const ca = caTheoId.get(k.caLamViecId)!;
        const dai = ca.ketThuc - ca.batDau;
        const dich = nhan.find((x) => phutTuan(nv.id) - phutTuan(x.id) > dai && hopLe(x.id, ca, k.ngayLam));
        if (dich) {
          xoa(nv.id, ca, k.ngayLam);
          ghi(dich.id, ca, k.ngayLam, k.ghiChu, false);
          daChuyen = true;
          break;
        }
      }
      if (daChuyen) break;
    }
    if (!daChuyen) break;
  }

  // Chỉ số để giám đốc đánh giá trước khi áp dụng
  const gioTheoNguoi = nhanSu.map((nv) => ({
    nhanVienId: nv.id,
    hoTen: nv.hoTen,
    nhom: nv.nhom,
    chuyenKhoa: nv.chuyenKhoa || null,
    soCa: ketQua.filter((k) => k.nhanVienId === nv.id).length,
    soGio: Math.round((phutTuan(nv.id) / 60) * 10) / 10,
    soNgay: lich.get(nv.id)?.size || 0,
    soCaKho: soCaKhoTuan(nv.id),
    nghi: ngay.filter((d) => nghi.has(`${nv.id}_${d}`)).length,
  }));
  const chenhLech = (Object.keys(TEN_NHOM) as NhomNhanSu[]).map((nhom) => {
    const ds = gioTheoNguoi.filter((g) => g.nhom === nhom);
    const gio = ds.map((g) => g.soGio);
    return {
      nhom,
      tenNhom: TEN_NHOM[nhom],
      soNguoi: ds.length,
      gioMax: gio.length ? Math.max(...gio) : 0,
      gioMin: gio.length ? Math.min(...gio) : 0,
    };
  }).filter((c) => c.soNguoi > 0);
  const phuNhuCau = nhuCau.map((nc) => ({ ...nc, tenCa: caTheoId.get(nc.caId)?.tenCa, daXep: daXep(nc) }));

  return { caDeXuat: ketQua, thieu, gioTheoNguoi, chenhLech, phuNhuCau };
}

/**
 * Nhu cầu nhân sự từng (ngày, ca):
 * - Bác sĩ theo khoa: max(dự báo BN của khoa × tỷ lệ ca, số lịch hẹn đã đặt) / công suất; tối thiểu 1 BS/khoa
 *   ở ca sáng + chiều Thứ 2–6 và ca sáng Thứ 7.
 * - Bác sĩ bất kỳ: BN của khoa chưa có bác sĩ / chưa phân khoa; tối thiểu 1 ở ca sáng Chủ nhật và các ca thêm Thứ 2–6.
 * - Ca có mở khám: lễ tân, thu ngân, dược ≥ 1 (thêm người theo số BN); kỹ thuật viên 1 ở ca sáng & chiều.
 */
export function tinhNhuCau(input: {
  ngay: string[];
  dsCa: CaXep[];
  dsKhoaBs: string[];
  bnNgayKhoa: Map<string, Map<string, number>>;
  nguonDuBao: Map<string, string>;
  tyLeCa: Map<number, number>;
  henDaDat: { ngay: string; caId: number; khoa: string | null }[];
  soBnMoiGioBs: number;
  soBnMoiNguoiHoTro: number;
  nhomCoNguoi: Set<NhomNhanSu>;
}) {
  const { ngay, dsCa, dsKhoaBs, bnNgayKhoa, nguonDuBao, tyLeCa, henDaDat, soBnMoiGioBs, soBnMoiNguoiHoTro, nhomCoNguoi } = input;
  const nhuCau: NhuCau[] = [];
  const canhBao = new Set<string>();
  const khoaBs = (khoa: string | null) => (khoa ? dsKhoaBs.find((k) => dungKhoa(k, khoa)) ?? null : null);
  const lamTron = (x: number) => Math.round(x * 10) / 10;

  ngay.forEach((d, i) => {
    const duBaoNgay = bnNgayKhoa.get(d) || new Map<string, number>();
    // Gom dự báo về đúng tên khoa của bác sĩ; khoa không có bác sĩ → bác sĩ bất kỳ
    const bnTheoKhoa = new Map<string | null, number>();
    for (const [khoa, bn] of duBaoNgay) {
      const k = khoaBs(khoa);
      if (!k && bn >= 1 && khoa !== 'Chưa phân khoa') canhBao.add(`Khoa "${khoa}" có bệnh nhân dự kiến nhưng chưa có bác sĩ — xếp bác sĩ bất kỳ.`);
      bnTheoKhoa.set(k, (bnTheoKhoa.get(k) || 0) + bn);
    }

    dsCa.forEach((ca, k) => {
      const gioCa = (ca.ketThuc - ca.batDau) / 60;
      const congSuat = Math.max(1, soBnMoiGioBs * gioCa);
      const toiThieuTheoKhoa = (k < 2 && i <= 4) || (k === 0 && i === 5);
      const toiThieuBatKy = (k === 0 && i === 6) || (k >= 2 && i <= 4);
      let tongBn = 0;
      let moCa = false;

      for (const khoa of [...dsKhoaBs, null]) {
        const duBao = (bnTheoKhoa.get(khoa) || 0) * (tyLeCa.get(ca.id) || 0);
        const hen = henDaDat.filter((h) => h.ngay === d && h.caId === ca.id && khoaBs(h.khoa) === khoa).length;
        const bn = Math.max(duBao, hen);
        const canTheoBn = bn >= 0.5 ? Math.ceil(bn / congSuat) : 0;
        const toiThieu = (khoa === null ? toiThieuBatKy : toiThieuTheoKhoa) ? 1 : 0;
        const can = Math.max(toiThieu, canTheoBn);
        if (!can) continue;
        tongBn += bn;
        moCa = true;
        nhuCau.push({
          ngay: d,
          caId: ca.id,
          nhom: 'bac_si',
          chuyenKhoa: khoa,
          can,
          duBaoBn: lamTron(bn),
          lyDo: canTheoBn > toiThieu
            ? `Dự kiến ${lamTron(bn)} BN (${hen} đã đặt lịch, dự báo ${lamTron(duBao)} - ${nguonDuBao.get(d) || 'không có'}) ÷ ${lamTron(congSuat)} BN/bác sĩ/ca`
            : khoa === null ? 'Phủ tối thiểu 1 bác sĩ trực' : 'Phủ tối thiểu 1 bác sĩ/khoa',
        });
      }
      if (!moCa) return;

      const hoTro: [NhomNhanSu, number][] = [
        ['tiep_tan', Math.max(1, Math.ceil(tongBn / soBnMoiNguoiHoTro))],
        ['thu_ngan', Math.max(1, Math.ceil(tongBn / soBnMoiNguoiHoTro))],
        ['nha_thuoc', Math.max(1, Math.ceil(tongBn / soBnMoiNguoiHoTro))],
        ['ky_thuat_vien', k < 2 ? 1 : 0],
      ];
      for (const [nhom, can] of hoTro) {
        if (!can) continue;
        if (!nhomCoNguoi.has(nhom)) {
          canhBao.add(`Chưa có nhân viên nhóm ${TEN_NHOM[nhom]} để xếp ca.`);
          continue;
        }
        nhuCau.push({
          ngay: d, caId: ca.id, nhom, chuyenKhoa: null, can, duBaoBn: lamTron(tongBn),
          lyDo: can > 1 ? `Ca dự kiến ${lamTron(tongBn)} BN ÷ ${soBnMoiNguoiHoTro} BN/người` : 'Tối thiểu 1 người mỗi ca mở khám',
        });
      }
    });
  });
  return { nhuCau, canhBao: [...canhBao] };
}
