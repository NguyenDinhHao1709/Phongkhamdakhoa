const BASE = 'http://localhost:5000/api';

const CLINICAL_CASES = [
  {
    trieuChung: 'Sốt nhẹ 38 độ, đau rát họng, nghẹt mũi và ho có đờm',
    lyDo: 'Khám tai mũi họng do đau họng 2 ngày',
    soBo: 'Theo dõi Viêm mũi họng cấp / Viêm đường hô hấp trên',
    xacDinh: 'J00 - Viêm mũi họng cấp tính',
    ketQua: 'Họng đỏ, niêm mạc phù nề, amidan không quá phát, phổi thông khí rõ.',
    phuongPhap: 'Nội khoa: Kháng sinh, giảm ho, súc họng nước muối sinh lý.',
    dichVuCls: [1], // Công thức máu
    kqCls: [{ giaTri: 'WBC 9.8 G/L', donVi: 'G/L', nhanXet: 'Bạch cầu tăng nhẹ phù hợp với viêm cấp tính' }]
  },
  {
    trieuChung: 'Đau âm ỉ vùng thượng vị, ợ chua nhiều sau ăn và khi đói',
    lyDo: 'Đau dạ dày tái phát kèm ợ chua',
    soBo: 'Theo dõi Viêm loét dạ dày tá tràng / GERD',
    xacDinh: 'K29.5 - Viêm dạ dày mạn tính; K21 - GERD',
    ketQua: 'Bụng mềm, ấn tức nhẹ thượng vị, không đề kháng thành bụng.',
    phuongPhap: 'Dùng thuốc ức chế tiết acid PPI, điều hòa nhu động, ăn uống đúng giờ.',
    dichVuCls: [4], // Siêu âm ổ bụng
    kqCls: [{ giaTri: 'Niêm mạc dạ dày phù nề xung huyết nhẹ', donVi: '', nhanXet: 'Hình ảnh viêm niêm mạc dạ dày mạn tính' }]
  },
  {
    trieuChung: 'Khát nước nhiều, sụt 2kg trong 1 tháng, tiểu nhiều về đêm',
    lyDo: 'Kiểm tra đường huyết định kỳ',
    soBo: 'Theo dõi Đái tháo đường typ 2',
    xacDinh: 'E11 - Đái tháo đường typ 2 không có biến chứng',
    ketQua: 'Thể trạng trung bình, mạch và huyết áp ổn định.',
    phuongPhap: 'Kiểm soát đường huyết bằng Metformin, chế độ ăn giảm tinh bột và tập thể dục 30p/ngày.',
    dichVuCls: [1, 2], // Công thức máu + Sinh hóa máu
    kqCls: [
      { giaTri: 'Bình thường', donVi: '', nhanXet: 'Các chỉ số huyết học trong giới hạn bình thường' },
      { giaTri: 'Glucose đói 7.8 mmol/L, HbA1c 7.1%', donVi: 'mmol/L', nhanXet: 'Đường huyết cao hơn ngưỡng chuẩn' }
    ]
  },
  {
    trieuChung: 'Đau đầu vùng chẩm, chóng mặt nhẹ khi thay đổi tư thế, đo huyết áp tại nhà 145/90',
    lyDo: 'Tái khám và đo huyết áp',
    soBo: 'Tăng huyết áp nguyên phát',
    xacDinh: 'I10 - Tăng huyết áp vô căn (nguyên phát)',
    ketQua: 'Huyết áp ghi nhận 142/88 mmHg, nhịp tim đều 78ck/phút, không phù chi.',
    phuongPhap: 'Duy trì thuốc hạ áp hàng ngày, ăn nhạt giảm muối, theo dõi huyết áp sáng chiều.',
    dichVuCls: [5], // Điện tâm đồ ECG
    kqCls: [{ giaTri: 'Nhịp xoang đều 78 ck/phút, trục trung gian', donVi: '', nhanXet: 'Chưa thấy biến đổi thiếu máu cục bộ cơ tim' }]
  }
];

async function login(u, p) {
  const r = await fetch(BASE + '/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenDangNhap: u, matKhau: p })
  });
  return (await r.json())?.data?.accessToken;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log('🔄 Đang khởi tạo bộ nạp phiên tự động (Auto-Workflow Engine)...');

  const [tTiepTan, tBacSi, tKTV, tThuNgan, tDuocSi] = await Promise.all([
    login('tieptan', '123456'),
    login('bacsi', '123456'),
    login('xetnghiem', '123456'),
    login('thungan', '123456'),
    login('nv1', '123456'),
  ]);

  if (!tTiepTan || !tBacSi || !tKTV || !tThuNgan || !tDuocSi) {
    console.error('❌ Lỗi đăng nhập xác thực tài khoản hệ thống!');
    return;
  }

  const h = (t) => ({ 'Content-Type': 'application/json', Authorization: 'Bearer ' + t });

  // Lấy danh sách thuốc
  const rThuoc = await fetch(BASE + '/nha-thuoc/thuoc', { headers: h(tBacSi) });
  const thuocList = (await rThuoc.json())?.data?.items || [{ id: 1 }, { id: 2 }];

  let cycle = 1;

  while (cycle <= 10) {
    const c = CLINICAL_CASES[(cycle - 1) % CLINICAL_CASES.length];
    console.log(`\n======================================================`);
    console.log(`⏱️ [PHIÊN #${cycle}] BẮT ĐẦU LUỒNG KHÁM: ${c.xacDinh}`);
    console.log(`======================================================`);

    try {
      // 1. Tiếp nhận
      const rTN = await fetch(BASE + '/tiep-nhan', {
        method: 'POST', headers: h(tTiepTan),
        body: JSON.stringify({ benhNhanId: 1, phongKhamId: 1, lyDoKham: c.lyDo })
      });
      const tn = (await rTN.json())?.data;
      const luotId = tn?.id;
      console.log(`1️⃣ [TIẾP TÂN] Tạo lượt STT: ${tn?.maSoThuTu} (ID: ${luotId})`);

      // Sinh hiệu
      await fetch(`${BASE}/tiep-nhan/${luotId}/sinh-hieu`, {
        method: 'POST', headers: h(tTiepTan),
        body: JSON.stringify({
          chieuCaoCm: 170 + Math.floor(Math.random() * 5),
          canNangKg: 65 + Math.floor(Math.random() * 5),
          nhietDoC: 36.5 + (Math.random() * 0.8),
          huyetApTamThu: 118 + Math.floor(Math.random() * 15),
          huyetApTamTruong: 78 + Math.floor(Math.random() * 8),
          nhipTim: 74 + Math.floor(Math.random() * 10),
          spo2: 98 + Math.floor(Math.random() * 2),
        })
      });

      // Điều phối
      await fetch(`${BASE}/tiep-nhan/${luotId}/phong-kham`, {
        method: 'PATCH', headers: h(tTiepTan),
        body: JSON.stringify({ phongKhamId: 1, bacSiId: 1 })
      });
      console.log(`   ➔ Đã ghi sinh hiệu & điều phối vào Phòng Khám 101`);
      await sleep(1500);

      // 2. Bác sĩ bắt đầu khám
      await fetch(`${BASE}/tiep-nhan/${luotId}/trang-thai`, {
        method: 'PATCH', headers: h(tBacSi),
        body: JSON.stringify({ trangThai: 'dang_kham' })
      });

      const rBA = await fetch(`${BASE}/ho-so-benh-an/benh-an-kham/1`, {
        method: 'POST', headers: h(tBacSi),
        body: JSON.stringify({
          luotTiepNhanId: luotId,
          trieuChung: c.trieuChung,
          chanDoanSoBo: c.soBo,
          hinhThucKham: 'truc_tiep'
        })
      });
      const benhAnId = (await rBA.json())?.data?.id;
      console.log(`2️⃣ [BÁC SĨ] Bắt đầu khám lâm sàng: Bệnh án #${benhAnId}`);

      // Chỉ định CLS
      const rCLS = await fetch(`${BASE}/xet-nghiem/chi-dinh`, {
        method: 'POST', headers: h(tBacSi),
        body: JSON.stringify({
          benhAnKhamId: benhAnId,
          dsChiDinh: c.dichVuCls.map(id => ({ dichVuXetNghiemId: id, ghiChuChiDinh: 'Chỉ định theo dõi lâm sàng' }))
        })
      });
      const clsItems = (await rCLS.json())?.data || [];
      console.log(`   ➔ Chỉ định ${clsItems.length} xét nghiệm/CĐHA`);

      // Kê đơn thuốc
      const rDT = await fetch(`${BASE}/nha-thuoc/don-thuoc`, {
        method: 'POST', headers: h(tBacSi),
        body: JSON.stringify({
          benhAnKhamId: benhAnId,
          ghiChu: 'Dùng thuốc theo chỉ định của bác sĩ.',
          chiTiet: [
            { thuocId: thuocList[0].id, soLuong: 10, lieuDung: 'Ngày 2 lần, mỗi lần 1 viên', soNgayDung: 5 },
            { thuocId: thuocList[1]?.id || thuocList[0].id, soLuong: 10, lieuDung: 'Ngày 2 lần sau ăn', soNgayDung: 5 }
          ]
        })
      });
      const dtId = (await rDT.json())?.data?.id;
      console.log(`   ➔ Đã kê đơn thuốc điện tử #${dtId}`);
      await sleep(1500);

      // 3. Kỹ thuật viên xử lý CLS
      for (let i = 0; i < clsItems.length; i++) {
        const item = clsItems[i];
        const resInfo = c.kqCls[i] || { giaTri: 'Bình thường', donVi: '', nhanXet: 'Trong giới hạn chuẩn' };

        await fetch(`${BASE}/xet-nghiem/chi-dinh/${item.id}/trang-thai`, {
          method: 'PATCH', headers: h(tKTV),
          body: JSON.stringify({ trangThai: 'dang_xu_ly' })
        });

        await fetch(`${BASE}/xet-nghiem/chi-dinh/${item.id}/ket-qua`, {
          method: 'POST', headers: h(tKTV),
          body: JSON.stringify({
            giaTri: resInfo.giaTri,
            donVi: resInfo.donVi,
            nhanXet: resInfo.nhanXet,
            fileDinhKem: '/uploads/kq-sample.pdf'
          })
        });

        await fetch(`${BASE}/xet-nghiem/chi-dinh/${item.id}/gui-bac-si`, {
          method: 'PATCH', headers: h(tKTV)
        });
      }
      console.log(`3️⃣ [KHOA XÉT NGHIỆM] Đã trả kết quả CLS về phòng khám`);
      await sleep(1500);

      // 4. Bác sĩ kết thúc khám
      await fetch(`${BASE}/ho-so-benh-an/benh-an-kham/${benhAnId}/ket-thuc`, {
        method: 'PATCH', headers: h(tBacSi),
        body: JSON.stringify({
          chanDoanXacDinh: c.xacDinh,
          ketQuaKham: c.ketQua,
          phuongPhapDieuTri: c.phuongPhap,
          taiKham: '2026-09-28',
          ghiChu: 'Tái khám đúng hẹn hoặc khi có triệu chứng bất thường.'
        })
      });
      console.log(`4️⃣ [BÁC SĨ] Hoàn tất chẩn đoán ICD-10 & Kết thúc khám`);
      await sleep(1500);

      // 5. Thu ngân
      const rHD = await fetch(`${BASE}/thanh-toan/luot-tiep-nhan/${luotId}`, {
        method: 'POST', headers: h(tThuNgan),
        body: JSON.stringify({ hinhThucThanhToan: 'tien_mat' })
      });
      const hd = (await rHD.json())?.data;
      if (hd?.id) {
        await fetch(`${BASE}/thanh-toan/hoa-don/${hd.id}/xac-nhan`, {
          method: 'PATCH', headers: h(tThuNgan),
          body: JSON.stringify({ phuongThuc: 'tien_mat', soTienNhan: hd.tongTien || 300000 })
        });
        console.log(`5️⃣ [THU NGÂN] Đã thanh toán viện phí: ${Number(hd.tongTien || 0).toLocaleString()} đ`);
      }
      await sleep(1500);

      // 6. Nhà thuốc cấp thuốc
      if (dtId) {
        await fetch(`${BASE}/nha-thuoc/don-thuoc/${dtId}/cap-phat`, {
          method: 'POST', headers: h(tDuocSi),
          body: JSON.stringify({ ghiChu: 'Đã phát đủ thuốc theo đơn' })
        });
        console.log(`6️⃣ [NHÀ THUỐC] Đã xuất kho và cấp phát thuốc cho người bệnh`);
      }

      console.log(`✨ [PHIÊN #${cycle}] HOÀN TẤT THÀNH CÔNG!`);
    } catch (err) {
      console.error(`⚠️ Lỗi tại phiên #${cycle}:`, err.message);
    }

    cycle++;
    console.log(`⏳ Chờ 3 giây trước phiên tiếp theo...`);
    await sleep(3000);
  }

  console.log('\n🏁 ĐÃ HOÀN TẤT CHU KỲ CHẠY TỰ ĐỘNG!');
}

main().catch(console.error);
