import { Injectable } from '@nestjs/common';
import { DataSource, EntitySubscriberInterface, InsertEvent, UpdateEvent, RemoveEvent } from 'typeorm';
import { QueueGateway } from './queue.gateway';

/**
 * Bảng mà màn hình hàng đợi (tiếp tân, phòng khám bác sĩ, tab xét nghiệm) đang hiển thị:
 * - luot_tiep_nhan: trạng thái lượt (CLS đổi sang dang_cls / da_co_kq_cls, kết thúc khám → chờ thanh toán,
 *   thu ngân thu xong → hoàn thành, đánh giá, kiosk tạo lượt…)
 * - hoa_don: bác sĩ chỉ thấy bệnh nhân sau khi đã đóng tạm ứng tại quầy
 * - sinh_hieu: điều dưỡng nhập sinh hiệu
 * - chi_dinh_can_lam_sang, ket_qua_xet_nghiem: tab xét nghiệm của bác sĩ (lấy mẫu, nhập kết quả)
 */
const BANG_HANG_DOI = new Set(['luot_tiep_nhan', 'hoa_don', 'sinh_hieu', 'chi_dinh_can_lam_sang', 'ket_qua_xet_nghiem']);

/** Gộp các thay đổi sát nhau (một thao tác thường ghi vài bảng) thành một lần báo */
const GOP_MS = 400;
/** Chờ thêm sau khi ghi để transaction (nếu có) commit xong trước khi client tải lại */
const TRE_TOI_THIEU_MS = 300;

/**
 * Báo 'queue:update' qua WebSocket khi bất kỳ module nào ghi vào các bảng trên — kể cả các module không
 * import được QueueGateway (xét nghiệm, thanh toán, hồ sơ bệnh án, đánh giá, kiosk).
 *
 * Trước đây chỉ tiep-nhan.service tự phát sự kiện, nên các thay đổi này chỉ hiện ra khi trang tự hỏi lại
 * server (2,5 giây trước đây, 15–20 giây sau khi giảm polling).
 *
 * Bắt được repo.save / repo.update / repo.insert / repo.delete (TypeORM phát afterUpdate cả với repo.update).
 * Không bắt được câu SQL thô (manager.query('UPDATE …')) — polling dự phòng phía client vẫn còn cho trường hợp đó.
 */
@Injectable()
export class HangDoiRealtimeSubscriber implements EntitySubscriberInterface {
  private hen: NodeJS.Timeout | null = null;

  constructor(dataSource: DataSource, private readonly gateway: QueueGateway) {
    dataSource.subscribers.push(this);
  }

  // Không khai báo listenTo() → nhận sự kiện của mọi entity, tự lọc theo tên bảng

  afterInsert(event: InsertEvent<any>) {
    this.neuLienQuan(event.metadata?.tableName);
  }

  afterUpdate(event: UpdateEvent<any>) {
    this.neuLienQuan(event.metadata?.tableName);
  }

  afterRemove(event: RemoveEvent<any>) {
    this.neuLienQuan(event.metadata?.tableName);
  }

  private neuLienQuan(tenBang?: string) {
    if (!tenBang || !BANG_HANG_DOI.has(tenBang)) return;
    // Đã hẹn báo rồi thì thay đổi này sẽ được gộp vào lần đó. Không hoãn lại hẹn cũ, để chuỗi ghi liên tục
    // (vd. chạy batch) không làm lần báo bị dời mãi.
    if (this.hen) return;
    this.hen = setTimeout(() => {
      this.hen = null;
      try {
        this.gateway.emitQueueUpdate();
      } catch {
        // Gateway chưa sẵn sàng (lúc khởi động) — bỏ qua, client còn polling dự phòng
      }
    }, Math.max(GOP_MS, TRE_TOI_THIEU_MS));
  }
}
