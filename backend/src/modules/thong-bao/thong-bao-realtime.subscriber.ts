import { Injectable } from '@nestjs/common';
import { DataSource, EntitySubscriberInterface, InsertEvent } from 'typeorm';
import { ThongBao } from './entities/thong-bao.entity';
import { QueueGateway } from '../tiep-nhan/queue.gateway';

/**
 * Mọi thông báo mới lưu vào bảng thong_bao (từ bất kỳ module nào) → báo realtime cho người nhận qua socket.
 * Chỉ gửi tín hiệu "có thông báo mới", không gửi nội dung: phòng user:<id> không xác thực,
 * client tự tải nội dung qua API /thong-bao (có JWT).
 */
@Injectable()
export class ThongBaoRealtimeSubscriber implements EntitySubscriberInterface<ThongBao> {
  constructor(dataSource: DataSource, private readonly gateway: QueueGateway) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return ThongBao;
  }

  afterInsert(event: InsertEvent<ThongBao>) {
    const userId = event.entity?.nguoiNhanId;
    // Trễ nhẹ để transaction (nếu có) commit xong trước khi client tải lại danh sách
    if (userId) setTimeout(() => this.gateway.emitNotification(userId, {}), 500);
  }
}
