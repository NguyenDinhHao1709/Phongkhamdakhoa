import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, DataSource } from 'typeorm';
import { BaiViet, TrangThaiBaiViet } from './entities/bai-viet.entity';
import { CreateBaiVietDto, UpdateBaiVietDto, PheDuyetBaiVietDto, QueryBaiVietDto } from './dto/bai-viet.dto';
import { MemoryCacheService } from '../../common/cache/memory-cache.service';

function generateSlug(text: string): string {
  let slug = text.toLowerCase().trim();
  slug = slug.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  slug = slug.replace(/[đĐ]/g, 'd');
  slug = slug.replace(/[^a-z0-9\s-]/g, '');
  slug = slug.replace(/[\s-]+/g, '-');
  slug = slug.replace(/^-+|-+$/g, '');
  return slug || 'bai-viet';
}

function getUserRole(user: any): string {
  return user?.maVaiTro || user?.vai_tro || user?.ma_vai_tro || '';
}

@Injectable()
export class BaiVietService {
  constructor(
    @InjectRepository(BaiViet)
    private readonly baiVietRepo: Repository<BaiViet>,
    private readonly dataSource: DataSource,
    private readonly cache: MemoryCacheService,
  ) {}

  // ─── 1. PUBLIC APIS ──────────────────────────────────────────
  async getPublicBaiViets(query: QueryBaiVietDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(50, Number(query.limit) || 10));
    const offset = (page - 1) * limit;

    let sql = `
      SELECT bv.id, bv.tieu_de AS tieuDe, bv.slug, bv.tom_tat AS tomTat, 
             bv.anh_dai_dien AS anhDaiDien, bv.chuyen_khoa AS chuyenKhoa,
             bv.luot_xem AS luotXem, bv.xuat_ban_luc AS xuatBanLuc, bv.tao_luc AS taoLuc,
             COALESCE(nv.ho_ten, nd.ten_dang_nhap, 'Bác sĩ chuyên khoa') AS tenTacGia,
             nv.chuc_vu AS chucVuTacGia,
             COALESCE(bs.bang_cap, nv.chuc_vu) AS hocViTacGia,
             nv.anh_dai_dien AS avatarTacGia, bs.id AS bacSiId,
             bs.chuyen_khoa AS chuyenKhoaBacSi
      FROM bai_viet bv
      LEFT JOIN nhan_vien nv ON bv.tac_gia_id = nv.id
      LEFT JOIN bac_si bs ON bs.nhan_vien_id = nv.id
      LEFT JOIN nguoi_dung nd ON nv.nguoi_dung_id = nd.id
      WHERE bv.trang_thai = 'xuat_ban'
    `;

    const params: any[] = [];

    if (query.chuyenKhoa && query.chuyenKhoa !== 'all') {
      sql += ` AND bv.chuyen_khoa = ?`;
      params.push(query.chuyenKhoa);
    }

    if (query.keyword && query.keyword.trim()) {
      const term = `%${query.keyword.trim().toLowerCase()}%`;
      sql += ` AND (LOWER(bv.tieu_de) LIKE ? OR LOWER(bv.tom_tat) LIKE ? OR LOWER(bv.chuyen_khoa) LIKE ?)`;
      params.push(term, term, term);
    }

    const countSql = `SELECT COUNT(*) AS total FROM (${sql}) AS subquery`;
    const [countRows] = await this.dataSource.query(countSql, params);
    const total = Number(countRows?.total || 0);

    sql += ` ORDER BY bv.xuat_ban_luc DESC, bv.id DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const items = await this.dataSource.query(sql, params);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPublicBaiVietDetail(idOrSlug: string) {
    const isNumeric = /^\d+$/.test(idOrSlug);
    let condition = isNumeric ? 'bv.id = ?' : 'bv.slug = ?';
    const param = isNumeric ? Number(idOrSlug) : idOrSlug;

    const sql = `
      SELECT bv.id, bv.tieu_de AS tieuDe, bv.slug, bv.tom_tat AS tomTat, bv.noi_dung AS noiDung,
             bv.anh_dai_dien AS anhDaiDien, bv.chuyen_khoa AS chuyenKhoa,
             bv.luot_xem AS luotXem, bv.xuat_ban_luc AS xuatBanLuc, bv.tao_luc AS taoLuc,
             COALESCE(nv.ho_ten, nd.ten_dang_nhap, 'Bác sĩ chuyên khoa') AS tenTacGia,
             nv.chuc_vu AS chucVuTacGia,
             COALESCE(bs.bang_cap, nv.chuc_vu) AS hocViTacGia,
             bs.chuyen_khoa AS chuyenKhoaBacSi, bs.mo_ta AS moTaBacSi,
             nv.anh_dai_dien AS avatarTacGia, bs.id AS bacSiId
      FROM bai_viet bv
      LEFT JOIN nhan_vien nv ON bv.tac_gia_id = nv.id
      LEFT JOIN bac_si bs ON bs.nhan_vien_id = nv.id
      LEFT JOIN nguoi_dung nd ON nv.nguoi_dung_id = nd.id
      WHERE ${condition} AND bv.trang_thai = 'xuat_ban'
      LIMIT 1
    `;

    const rows = await this.dataSource.query(sql, [param]);
    if (!rows || rows.length === 0) {
      throw new NotFoundException('Không tìm thấy bài viết hoặc bài viết chưa được xuất bản');
    }

    const article = rows[0];

    // Tăng lượt xem bất đồng bộ không làm chậm response
    this.baiVietRepo.increment({ id: article.id }, 'luotXem', 1).catch(() => {});

    // Lấy thêm 3 bài viết liên quan cùng chuyên khoa
    const relatedSql = `
      SELECT bv.id, bv.tieu_de AS tieuDe, bv.slug, bv.tom_tat AS tomTat, 
             bv.anh_dai_dien AS anhDaiDien, bv.chuyen_khoa AS chuyenKhoa,
             bv.xuat_ban_luc AS xuatBanLuc,
             COALESCE(nv.ho_ten, nd.ten_dang_nhap, 'Bác sĩ chuyên khoa') AS tenTacGia
      FROM bai_viet bv
      LEFT JOIN nhan_vien nv ON bv.tac_gia_id = nv.id
      LEFT JOIN nguoi_dung nd ON nv.nguoi_dung_id = nd.id
      WHERE bv.trang_thai = 'xuat_ban' AND bv.id != ?
      ${article.chuyenKhoa ? 'AND bv.chuyen_khoa = ?' : ''}
      ORDER BY bv.xuat_ban_luc DESC LIMIT 3
    `;
    const relatedParams = article.chuyenKhoa ? [article.id, article.chuyenKhoa] : [article.id];
    const related = await this.dataSource.query(relatedSql, relatedParams);

    return {
      article,
      related,
    };
  }

  // ─── 2. NỘI BỘ APIS (BÁC SĨ & BAN GIÁM ĐỐC) ────────────────
  async getNoiBoBaiViets(user: any, query: QueryBaiVietDto) {
    const role = getUserRole(user);
    const isDoctor = role === 'bac_si';
    const isDirector = role === 'ban_giam_doc';

    if (!isDoctor && !isDirector) {
      throw new ForbiddenException('Chỉ Bác sĩ và Ban Giám Đốc mới có quyền truy cập quản lý bài viết y khoa');
    }

    let sql = `
      SELECT bv.id, bv.tieu_de AS tieuDe, bv.slug, bv.tom_tat AS tomTat, 
             bv.anh_dai_dien AS anhDaiDien, bv.chuyen_khoa AS chuyenKhoa,
             bv.trang_thai AS trangThai, bv.ly_do_tu_choi AS lyDoTuChoi,
             bv.luot_xem AS luotXem, bv.xuat_ban_luc AS xuatBanLuc, bv.tao_luc AS taoLuc,
             bv.tac_gia_id AS tacGiaId,
             COALESCE(nv.ho_ten, nd.ten_dang_nhap, 'Bác sĩ chuyên khoa') AS tenTacGia,
             COALESCE(bs.bang_cap, nv.chuc_vu) AS hocViTacGia,
             bs.chuyen_khoa AS chuyenKhoaBacSi,
             COALESCE(nv_duyet.ho_ten, nd_duyet.ten_dang_nhap) AS tenNguoiDuyet
      FROM bai_viet bv
      LEFT JOIN nhan_vien nv ON bv.tac_gia_id = nv.id
      LEFT JOIN bac_si bs ON bs.nhan_vien_id = nv.id
      LEFT JOIN nguoi_dung nd ON nv.nguoi_dung_id = nd.id
      LEFT JOIN nguoi_dung nd_duyet ON bv.nguoi_duyet_id = nd_duyet.id
      LEFT JOIN nhan_vien nv_duyet ON nv_duyet.nguoi_dung_id = nd_duyet.id
      WHERE 1=1
    `;
    const params: any[] = [];

    // Bác sĩ chỉ xem bài do mình viết hoặc các bài đã được xuất bản công khai
    if (isDoctor && !isDirector) {
      const nvRows = await this.dataSource.query(
        `SELECT id FROM nhan_vien WHERE nguoi_dung_id = ? LIMIT 1`,
        [user.id],
      );
      const myNvId = nvRows && nvRows.length > 0 ? nvRows[0].id : null;

      sql += ` AND (bv.tac_gia_id = ? OR bv.tac_gia_id = ? OR bv.trang_thai = 'xuat_ban')`;
      params.push(user.id, myNvId);
    }

    if (query.trangThai && query.trangThai !== 'all') {
      sql += ` AND bv.trang_thai = ?`;
      params.push(query.trangThai);
    }

    if (query.chuyenKhoa && query.chuyenKhoa !== 'all') {
      sql += ` AND bv.chuyen_khoa = ?`;
      params.push(query.chuyenKhoa);
    }

    if (query.keyword && query.keyword.trim()) {
      const term = `%${query.keyword.trim().toLowerCase()}%`;
      sql += ` AND (LOWER(bv.tieu_de) LIKE ? OR LOWER(bv.tom_tat) LIKE ?)`;
      params.push(term, term);
    }

    sql += ` ORDER BY bv.id DESC`;

    const items = await this.dataSource.query(sql, params);
    return items;
  }

  async createBaiViet(dto: CreateBaiVietDto, user: any) {
    let baseSlug = generateSlug(dto.tieuDe);
    let finalSlug = baseSlug;
    let counter = 1;

    // Đảm bảo slug là duy nhất
    while (await this.baiVietRepo.findOne({ where: { slug: finalSlug } })) {
      finalSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    const role = getUserRole(user);
    const isDirector = role === 'ban_giam_doc';
    let trangThai = TrangThaiBaiViet.NHAP;

    if (dto.trangThai === TrangThaiBaiViet.CHO_DUYET) {
      trangThai = TrangThaiBaiViet.CHO_DUYET;
    } else if (dto.trangThai === TrangThaiBaiViet.XUAT_BAN && isDirector) {
      trangThai = TrangThaiBaiViet.XUAT_BAN;
    }

    // Tra cứu nhan_vien.id tương ứng với tài khoản người dùng đăng nhập
    const nvRows = await this.dataSource.query(
      `SELECT id FROM nhan_vien WHERE nguoi_dung_id = ? LIMIT 1`,
      [user.id],
    );
    const tacGiaNhanVienId = nvRows && nvRows.length > 0 ? nvRows[0].id : user.id;

    const baiViet = this.baiVietRepo.create({
      tieuDe: dto.tieuDe.trim(),
      slug: finalSlug,
      tomTat: dto.tomTat?.trim(),
      noiDung: dto.noiDung,
      anhDaiDien: dto.anhDaiDien || 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800',
      chuyenKhoa: dto.chuyenKhoa || 'Nội tổng quát',
      tacGiaId: tacGiaNhanVienId,
      trangThai,
      xuatBanLuc: trangThai === TrangThaiBaiViet.XUAT_BAN ? new Date() : null,
      nguoiDuyetId: trangThai === TrangThaiBaiViet.XUAT_BAN ? user.id : null,
    });

    const saved = await this.baiVietRepo.save(baiViet);
    return {
      message: trangThai === TrangThaiBaiViet.CHO_DUYET
        ? 'Đã gửi bài viết lên Ban Giám Đốc chờ phê duyệt'
        : trangThai === TrangThaiBaiViet.XUAT_BAN
        ? 'Đã xuất bản bài viết lên trang chủ thành công'
        : 'Đã lưu bản nháp bài viết thành công',
      data: saved,
    };
  }

  async updateBaiViet(id: number, dto: UpdateBaiVietDto, user: any) {
    const baiViet = await this.baiVietRepo.findOne({ where: { id } });
    if (!baiViet) {
      throw new NotFoundException('Không tìm thấy bài viết');
    }

    const role = getUserRole(user);
    const isDirector = role === 'ban_giam_doc';

    const nvRows = await this.dataSource.query(
      `SELECT id FROM nhan_vien WHERE nguoi_dung_id = ? LIMIT 1`,
      [user.id],
    );
    const myNvId = nvRows && nvRows.length > 0 ? nvRows[0].id : null;
    const isAuthor = baiViet.tacGiaId === user.id || (myNvId && baiViet.tacGiaId === myNvId);

    if (!isDirector && !isAuthor) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa bài viết của tác giả khác');
    }

    // Bác sĩ chỉ được sửa khi bài đang ở trạng thái Nháp hoặc Bị từ chối
    if (!isDirector && ![TrangThaiBaiViet.NHAP, TrangThaiBaiViet.TU_CHOI].includes(baiViet.trangThai)) {
      throw new BadRequestException('Bài viết đang chờ duyệt hoặc đã xuất bản, không thể tự chỉnh sửa. Vui lòng liên hệ Ban Giám Đốc.');
    }

    if (dto.tieuDe && dto.tieuDe.trim() !== baiViet.tieuDe) {
      baiViet.tieuDe = dto.tieuDe.trim();
      let baseSlug = generateSlug(dto.tieuDe);
      let finalSlug = baseSlug;
      let counter = 1;
      while (await this.baiVietRepo.findOne({ where: { slug: finalSlug } })) {
        if (finalSlug === baiViet.slug) break;
        finalSlug = `${baseSlug}-${counter}`;
        counter++;
      }
      baiViet.slug = finalSlug;
    }

    if (dto.tomTat !== undefined) baiViet.tomTat = dto.tomTat;
    if (dto.noiDung !== undefined) baiViet.noiDung = dto.noiDung;
    if (dto.anhDaiDien !== undefined) baiViet.anhDaiDien = dto.anhDaiDien;
    if (dto.chuyenKhoa !== undefined) baiViet.chuyenKhoa = dto.chuyenKhoa;

    if (dto.trangThai) {
      if (isDirector) {
        baiViet.trangThai = dto.trangThai;
        if (dto.trangThai === TrangThaiBaiViet.XUAT_BAN && !baiViet.xuatBanLuc) {
          baiViet.xuatBanLuc = new Date();
          baiViet.nguoiDuyetId = user.id;
        }
      } else if (dto.trangThai === TrangThaiBaiViet.CHO_DUYET) {
        baiViet.trangThai = TrangThaiBaiViet.CHO_DUYET;
      }
    }

    const updated = await this.baiVietRepo.save(baiViet);
    return {
      message: 'Cập nhật bài viết thành công',
      data: updated,
    };
  }

  async guiDuyetBaiViet(id: number, user: any) {
    const baiViet = await this.baiVietRepo.findOne({ where: { id } });
    if (!baiViet) throw new NotFoundException('Không tìm thấy bài viết');

    const role = getUserRole(user);
    const nvRows = await this.dataSource.query(
      `SELECT id FROM nhan_vien WHERE nguoi_dung_id = ? LIMIT 1`,
      [user.id],
    );
    const myNvId = nvRows && nvRows.length > 0 ? nvRows[0].id : null;
    const isAuthor = baiViet.tacGiaId === user.id || (myNvId && baiViet.tacGiaId === myNvId);

    if (!isAuthor && role !== 'ban_giam_doc') {
      throw new ForbiddenException('Bạn không có quyền gửi duyệt bài viết này');
    }

    baiViet.trangThai = TrangThaiBaiViet.CHO_DUYET;
    baiViet.lyDoTuChoi = null;
    await this.baiVietRepo.save(baiViet);

    return {
      message: 'Đã gửi bài viết lên Ban Giám Đốc chờ phê duyệt',
      data: baiViet,
    };
  }

  async pheDuyetBaiViet(id: number, dto: PheDuyetBaiVietDto, user: any) {
    const role = getUserRole(user);
    const isDirector = role === 'ban_giam_doc';
    if (!isDirector) {
      throw new ForbiddenException('Chỉ Ban Giám Đốc mới có thẩm quyền phê duyệt và xuất bản bài viết');
    }

    const baiViet = await this.baiVietRepo.findOne({ where: { id } });
    if (!baiViet) throw new NotFoundException('Không tìm thấy bài viết');

    baiViet.trangThai = dto.trangThai;
    baiViet.nguoiDuyetId = user.id;

    if (dto.trangThai === TrangThaiBaiViet.XUAT_BAN) {
      baiViet.xuatBanLuc = new Date();
      baiViet.lyDoTuChoi = null;
    } else if (dto.trangThai === TrangThaiBaiViet.TU_CHOI) {
      baiViet.lyDoTuChoi = dto.lyDoTuChoi || 'Nội dung chưa đạt tiêu chuẩn truyền thông y tế';
    }

    await this.baiVietRepo.save(baiViet);

    return {
      message: dto.trangThai === TrangThaiBaiViet.XUAT_BAN
        ? 'Phê duyệt và xuất bản bài viết thành công'
        : dto.trangThai === TrangThaiBaiViet.TU_CHOI
        ? 'Đã trả về bài viết kèm lý do yêu cầu chỉnh sửa'
        : 'Đã cập nhật trạng thái bài viết',
      data: baiViet,
    };
  }

  async xoaBaiViet(id: number, user: any) {
    const baiViet = await this.baiVietRepo.findOne({ where: { id } });
    if (!baiViet) throw new NotFoundException('Không tìm thấy bài viết');

    const role = getUserRole(user);
    const isDirector = role === 'ban_giam_doc';

    const nvRows = await this.dataSource.query(
      `SELECT id FROM nhan_vien WHERE nguoi_dung_id = ? LIMIT 1`,
      [user.id],
    );
    const myNvId = nvRows && nvRows.length > 0 ? nvRows[0].id : null;
    const isAuthor = baiViet.tacGiaId === user.id || (myNvId && baiViet.tacGiaId === myNvId);

    if (!isDirector && !isAuthor) {
      throw new ForbiddenException('Bạn không có quyền xóa bài viết này');
    }

    // Nếu đã xuất bản, chuyển sang 'an' thay vì xóa vật lý để giữ toàn vẹn liên kết SEO nếu tác giả xóa
    if (baiViet.trangThai === TrangThaiBaiViet.XUAT_BAN && !isDirector) {
      baiViet.trangThai = TrangThaiBaiViet.AN;
      await this.baiVietRepo.save(baiViet);
      return { message: 'Đã tạm ẩn bài viết khỏi trang công khai' };
    }

    await this.baiVietRepo.delete(id);
    return { message: 'Đã xóa bài viết thành công' };
  }
}
