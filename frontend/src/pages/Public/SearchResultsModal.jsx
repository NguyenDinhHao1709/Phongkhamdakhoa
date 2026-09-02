import { useState, useEffect } from 'react';
import { Search, X, User, HeartPulse, BookOpen } from 'lucide-react';
import { apiGet } from '../../services/api';
import { MedButton } from '../../design-system/components/Button/MedButton';

export default function SearchResultsModal({ keyword, onClose, onSelectDoctor, onSelectSpecialty, onSelectArticle }) {
  const [activeTab, setActiveTab] = useState('all');
  const [dbDoctors, setDbDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);

  // Fetch real Doctors from MySQL database API
  useEffect(() => {
    fetchRealDoctors();
  }, [keyword]);

  const fetchRealDoctors = async () => {
    setLoadingDoctors(true);
    try {
      const res = await apiGet(`/nhan-vien/bac-si-public?search=${encodeURIComponent(keyword || '')}`);
      if (res.data) setDbDoctors(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDoctors(false);
    }
  };

  // Catalog Data for Specialties and Articles
  const CHUYEN_KHOA_LIST = [
    { id: 1, ten: 'Nội tổng quát', moTa: 'Tầm soát & khám điều trị bệnh lý chung, huyết áp, tiểu đường, dạ dày' },
    { id: 2, ten: 'Ngoại khoa', moTa: 'Phẫu thuật, tiểu phẫu khâu rửa vết thương, tư vấn phẫu thuật an toàn' },
    { id: 3, ten: 'Nhi khoa', moTa: 'Khám chữa bệnh lý thường gặp ở trẻ sơ sinh và trẻ nhỏ, tư vấn tiêm chủng' },
    { id: 4, ten: 'Tai Mũi Họng', moTa: 'Điều trị viêm xoang, viêm họng hạt, viêm tai giữa, nội soi Tai Mũi Họng' },
    { id: 5, ten: 'Tim mạch', moTa: 'Đo điện tâm đồ, siêu âm tim, khám các bệnh lý tăng huyết áp, rối loạn nhịp tim' },
    { id: 6, ten: 'Cơ Xương Khớp', moTa: 'Điều trị thoát vị đĩa đệm, thoái hóa khớp, đau thần kinh tọa, loãng xương' },
    { id: 7, ten: 'Răng Hàm Mặt', moTa: 'Nhổ răng sâu, hàn răng, làm răng thẩm mỹ, chăm sóc sức khỏe răng miệng' },
    { id: 8, ten: 'Mắt', moTa: 'Đo khúc xạ thị lực, khám điều trị tật cận thị, viễn thị, viêm kết mạc' },
  ];

  const BAI_VIET_LIST = [
    { id: 1, tieuDe: 'Hướng dẫn chăm sóc sức khỏe cho người bị tăng huyết áp tại nhà', danhMuc: 'Tim mạch', tacGia: 'BS. Lê Hoàng Cường', tomTat: 'Cách kiểm soát chỉ số huyết áp bằng chế độ ăn giảm muối, tập thể dục nhẹ nhàng và dùng thuốc đúng giờ.' },
    { id: 2, tieuDe: 'Cách phòng ngừa bệnh viêm xoang, viêm họng khi thời tiết chuyển mùa', danhMuc: 'Tai Mũi Họng', tacGia: 'BS. Phạm Minh Đức', tomTat: 'Giữ ấm vùng cổ mặt, rửa mũi bằng nước muối sinh lý hàng ngày để tránh vi khuẩn tấn công.' },
    { id: 3, tieuDe: 'Chế độ dinh dưỡng khoa học giúp trẻ tăng cường sức đề kháng', danhMuc: 'Nhi khoa', tacGia: 'BS. Trần Thị Bình', tomTat: 'Bổ sung đầy đủ Vitamin C, Zinc, Protein và tiêm ngừa đúng lịch giúp bé luôn khỏe mạnh.' },
    { id: 4, tieuDe: 'Nhận biết sớm triệu chứng thoát vị đĩa đệm và cách phòng tránh', danhMuc: 'Cơ Xương Khớp', tacGia: 'BS. Vũ Hoàng Nam', tomTat: 'Các bài tập kéo giãn cơ lưng, chú ý tư thế ngồi làm việc đúng cách tránh tổn thương cột sống.' },
    { id: 5, tieuDe: 'Bệnh dạ dày: Nguyên nhân, triệu chứng và lời khuyên ăn uống', danhMuc: 'Nội tổng quát', tacGia: 'BS. Nguyễn Văn An', tomTat: 'Tránh ăn đồ quá chua cay, không thức khuya và duy trì thói quen ăn uống đúng giờ.' },
  ];

  const term = (keyword || '').toLowerCase().trim();

  const filteredChuyenKhoa = CHUYEN_KHOA_LIST.filter(
    (item) => item.ten.toLowerCase().includes(term) || item.moTa.toLowerCase().includes(term)
  );

  const filteredBaiViet = BAI_VIET_LIST.filter(
    (item) => item.tieuDe.toLowerCase().includes(term) || item.danhMuc.toLowerCase().includes(term) || item.tomTat.toLowerCase().includes(term)
  );

  const totalResults = filteredChuyenKhoa.length + dbDoctors.length + filteredBaiViet.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-gray-100 flex flex-col max-h-[85vh]">
        {/* Header Search Info */}
        <div className="flex items-center justify-between border-b px-6 py-4 bg-gray-50/80 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-white shadow-sm">
              <Search className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Kết quả tìm kiếm cho: <span className="text-primary-600">"{keyword}"</span>
              </h3>
              <p className="text-xs text-gray-500">
                Tìm thấy <strong className="text-gray-800">{totalResults}</strong> kết quả phù hợp
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Filters */}
        <div className="flex border-b px-6 gap-2 bg-white text-xs font-semibold">
          <button
            onClick={() => setActiveTab('all')}
            className={`py-3 px-4 border-b-2 transition-colors ${
              activeTab === 'all' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            Tất cả ({totalResults})
          </button>
          <button
            onClick={() => setActiveTab('bac_si')}
            className={`py-3 px-4 border-b-2 transition-colors ${
              activeTab === 'bac_si' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            👨‍⚕️ Bác sĩ ({dbDoctors.length})
          </button>
          <button
            onClick={() => setActiveTab('chuyen_khoa')}
            className={`py-3 px-4 border-b-2 transition-colors ${
              activeTab === 'chuyen_khoa' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            🩺 Chuyên khoa ({filteredChuyenKhoa.length})
          </button>
          <button
            onClick={() => setActiveTab('bai_viet')}
            className={`py-3 px-4 border-b-2 transition-colors ${
              activeTab === 'bai_viet' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            📰 Bài viết ({filteredBaiViet.length})
          </button>
        </div>

        {/* Results List Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-sm bg-gray-50/50">
          {loadingDoctors ? (
            <div className="p-12 text-center text-gray-500">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent mx-auto mb-3"></div>
              Đang tìm kiếm thông tin Bác sĩ & Chuyên khoa...
            </div>
          ) : totalResults === 0 ? (
            <div className="p-12 text-center text-gray-500 space-y-3">
              <Search className="h-10 w-10 text-gray-300 mx-auto" />
              <p className="font-semibold text-gray-700">Không tìm thấy kết quả nào phù hợp với từ khóa "{keyword}".</p>
              <p className="text-xs text-gray-400">Thử tìm kiếm với tên bác sĩ hoặc chuyên khoa như "Nội tổng quát", "Nhi khoa", "Nguyễn"...</p>
            </div>
          ) : (
            <>
              {/* Category 1: Bác Sĩ */}
              {(activeTab === 'all' || activeTab === 'bac_si') && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase text-gray-500 flex items-center gap-1.5">
                    <User className="h-4 w-4 text-primary-600" /> Đội ngũ Bác sĩ ({dbDoctors.length})
                  </h4>
                  {dbDoctors.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">Không có bác sĩ nào khớp với từ khóa tìm kiếm.</p>
                  ) : (
                    <div className="space-y-2">
                      {dbDoctors.map((bs) => (
                        <div
                          key={bs.id}
                          onClick={() => {
                            onSelectDoctor?.(bs);
                            onClose?.();
                          }}
                          className="p-4 rounded-xl bg-white border border-gray-200 hover:border-primary-400 hover:shadow-sm transition-all cursor-pointer flex items-center justify-between"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="font-bold text-gray-900 text-base">{bs.hoTen}</h5>
                              <span className="text-xs font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded border border-primary-200">
                                {bs.chuyenKhoa}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 mt-1">{bs.bangCap}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{bs.moTa}</p>
                          </div>
                          <MedButton size="sm" variant="primary">
                            Đặt lịch khám
                          </MedButton>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Category 2: Chuyên Khoa */}
              {(activeTab === 'all' || activeTab === 'chuyen_khoa') && filteredChuyenKhoa.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase text-gray-500 flex items-center gap-1.5">
                    <HeartPulse className="h-4 w-4 text-primary-600" /> Chuyên khoa ({filteredChuyenKhoa.length})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredChuyenKhoa.map((ck) => (
                      <div
                        key={ck.id}
                        onClick={() => {
                          onSelectSpecialty?.(ck);
                          onClose?.();
                        }}
                        className="p-4 rounded-xl bg-white border border-gray-200 hover:border-primary-400 hover:shadow-sm transition-all cursor-pointer space-y-1"
                      >
                        <h5 className="font-bold text-gray-900 text-sm">{ck.ten}</h5>
                        <p className="text-xs text-gray-500 line-clamp-2">{ck.moTa}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Category 3: Bài Viết Y Học */}
              {(activeTab === 'all' || activeTab === 'bai_viet') && filteredBaiViet.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase text-gray-500 flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4 text-primary-600" /> Cẩm nang & Bài viết Y tế ({filteredBaiViet.length})
                  </h4>
                  <div className="space-y-2">
                    {filteredBaiViet.map((bv) => (
                      <div
                        key={bv.id}
                        onClick={() => {
                          onSelectArticle?.(bv);
                          onClose?.();
                        }}
                        className="p-4 rounded-xl bg-white border border-gray-200 hover:border-primary-400 hover:shadow-sm transition-all cursor-pointer space-y-1.5"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded border border-primary-200">
                            {bv.danhMuc}
                          </span>
                          <h5 className="font-bold text-gray-900 text-sm">{bv.tieuDe}</h5>
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-2">{bv.tomTat}</p>
                        <p className="text-[11px] text-gray-400">Tác giả: {bv.tacGia}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

