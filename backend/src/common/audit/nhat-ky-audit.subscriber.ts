import { Injectable } from '@nestjs/common';
import { DataSource, EntitySubscriberInterface } from 'typeorm';
import { NhatKyHeThong } from '../../modules/quan-ly/entities/nhat-ky-he-thong.entity';
import { auditContext } from './audit-log.interceptor';

/** Khi code nghiệp vụ tự ghi nhật ký trong request → báo AuditLogInterceptor bỏ qua để không ghi trùng */
@Injectable()
export class NhatKyAuditSubscriber implements EntitySubscriberInterface<NhatKyHeThong> {
  constructor(dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return NhatKyHeThong;
  }

  afterInsert() {
    const store = auditContext.getStore();
    if (store) store.daGhiLog = true;
  }
}
