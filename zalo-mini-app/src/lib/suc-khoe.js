import { api } from "./api";

/**
 * Tóm tắt sức khỏe (giống trang Bác sĩ AI bản web): lấy từ hồ sơ khám (/ho-so-benh-an/cua-toi),
 * rồi bổ sung từ /ai/patient-summary nếu AI service đang chạy.
 */
export async function taiTomTatSucKhoe() {
  const emr = (await api.get("/ho-so-benh-an/cua-toi")).data || {};
  const bn = emr.benhNhan;
  const luot = Array.isArray(emr.lichSuKham) ? emr.lichSuKham : [];
  const ganNhat = luot[0];

  let donMoiNhat = null;
  for (const lk of luot) {
    if (Array.isArray(lk?.donThuoc) && lk.donThuoc.length) {
      donMoiNhat = lk.donThuoc[0];
      break;
    }
  }
  const danhSachThuoc = (donMoiNhat?.chiTiet || donMoiNhat?.chiTietDonThuoc || []).map((ct) => ({
    id: ct.id,
    tenThuoc: ct.thuoc?.tenThuoc || "Thuốc điều trị",
    tenHoatChat: ct.thuoc?.tenHoatChat || "",
    soLuong: ct.soLuong || 1,
    donViTinh: ct.thuoc?.donViTinh || "Viên",
    lieuDung: ct.lieuDung || "Theo chỉ định của bác sĩ",
    soNgayDung: ct.soNgayDung || null,
  }));

  let tomTat = {
    hoTen: bn?.hoTen || "Bệnh nhân",
    maBenhNhan: bn?.maBenhNhan || "",
    maHoSo: emr.maHoSo || "",
    soLuotKham: luot.length,
    chanDoanGanNhat: ganNhat?.chanDoanXacDinh || ganNhat?.chanDoanSoBo || null,
    ngayKham: ganNhat?.ngayKham || null,
    taiKham: ganNhat?.taiKham || null,
    bacSiDieuTri: ganNhat?.bacSi
      ? {
          id: ganNhat.bacSi.id,
          hoTen: ganNhat.bacSi.nhanVien?.hoTen || ganNhat.bacSiTen || "Bác sĩ điều trị",
          chuyenKhoa: ganNhat.bacSi.chuyenKhoa || "",
        }
      : null,
    danhSachThuoc,
  };

  try {
    const ai = (await api.get("/ai/patient-summary")).data;
    if (ai && (ai.hoTen || ai.chanDoanGanNhat)) {
      tomTat = {
        ...tomTat,
        ...Object.fromEntries(Object.entries(ai).filter(([, v]) => v !== null && v !== undefined && v !== "")),
        danhSachThuoc: ai.danhSachThuoc?.length ? ai.danhSachThuoc : danhSachThuoc,
      };
    }
  } catch {
    // AI service ngủ / lỗi: dùng dữ liệu hồ sơ khám
  }
  return tomTat;
}

/** Chia thuốc vào cữ sáng / trưa / tối theo liều dùng (cùng quy tắc với bản web) */
export function chiaCuThuoc(danhSachThuoc) {
  const sang = [];
  const trua = [];
  const toi = [];
  for (const t of danhSachThuoc || []) {
    const ld = (t.lieuDung || "").toLowerCase();
    const coSang = ld.includes("sáng");
    const coTrua = ld.includes("trưa");
    const coToi = ld.includes("tối") || ld.includes("chiều") || ld.includes("ngủ");
    const lan2 = ld.includes("2 lần") || ld.includes("12h") || ld.includes("12 tiếng");
    const lan3 = ld.includes("3 lần") || ld.includes("8h") || ld.includes("8 tiếng");
    const lan4 = ld.includes("4 lần") || ld.includes("6h") || ld.includes("6 tiếng");
    if (coSang || lan2 || lan3 || lan4 || (!coTrua && !coToi)) sang.push(t);
    if (coTrua || lan3 || lan4) trua.push(t);
    if (coToi || lan2 || lan3 || lan4) toi.push(t);
  }
  return { sang, trua, toi };
}
