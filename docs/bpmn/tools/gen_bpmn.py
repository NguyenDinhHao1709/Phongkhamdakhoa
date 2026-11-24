"""Sinh sơ đồ BPMN 2.0 (kèm DI) cho docs/bpmn với layout lưới cột × làn.
Dùng (từ docs/bpmn/tools): python gen_bpmn.py 01 ../01_kham_benh_truc_tiep.bpmn
  rồi xuất ảnh: node render.mjs ../01_kham_benh_truc_tiep.bpmn ../01_kham_benh_truc_tiep.png

Nút: (id, loại, tên, làn, cột, hàng)   hàng: -1 trên / 0 giữa / 1 dưới trong làn
Luồng: (nguồn, đích, nhãn[, kiểu])     kiểu:
  hv[:dx]      ngang ra cạnh phải rồi dọc vào đích (dx: lệch điểm vào)
  vh           dọc từ đỉnh/đáy nguồn rồi ngang vào cạnh trái đích
  rd           ngang ra 30px, dọc tới hàng đích, ngang vào cạnh trái đích
  top:d:dx / bot:d:dx   vòng qua kênh cách mép trên/dưới làn d px
"""
import sys
from xml.sax.saxutils import escape as _esc


def escape(v):
    return _esc(v, {'"': '&quot;'})

X0, COLW, LANE_X, POOL_X = 230, 175, 120, 90
TW, TH, GW, EV = 160, 80, 50, 36

SPECS = {}

# ───────────────────────── 01. Khám bệnh trực tiếp ─────────────────────────
SPECS["01"] = dict(
    key="KhamTrucTiep", title="Quy trình khám bệnh ngoại trú trực tiếp",
    lanes=[("Lane_BN", "Bệnh nhân", 135), ("Lane_LT", "Lễ tân / Kiosk", 220), ("Lane_HT", "Hệ thống", 150),
           ("Lane_TN", "Thu ngân", 230), ("Lane_BS", "Bác sĩ", 135), ("Lane_KTV", "Kỹ thuật viên", 135),
           ("Lane_NT", "Nhà thuốc", 135)],
    nodes=[
        ("Start", "startEvent", "Bệnh nhân đến phòng khám", "Lane_BN", 0, 0),
        ("GwHen", "exclusiveGateway", "Có lịch hẹn hôm nay?", "Lane_LT", 1, 0),
        ("CheckIn", "userTask", "Check-in lịch hẹn (quầy / kiosk)", "Lane_LT", 2, -1),
        ("TaoLuot", "userTask", "Tìm / tạo hồ sơ, chọn chuyên khoa, bác sĩ, đối tượng ưu tiên", "Lane_LT", 2, 1),
        ("CapSo", "serviceTask", "Tạo lượt tiếp nhận, cấp số thứ tự A/B", "Lane_LT", 3, 0),
        ("GwCapCuu", "exclusiveGateway", "Cấp cứu?", "Lane_HT", 4, 0),
        ("TinhTU", "serviceTask", "Lập phiếu tạm ứng TU (phí khám − BHYT − cọc)", "Lane_HT", 5, 0),
        ("GwConThu", "exclusiveGateway", "Còn phải thu?", "Lane_HT", 6, 0),
        ("ThuTU", "userTask", "Thu tạm ứng phí khám (tại quầy / QR PayOS)", "Lane_TN", 7, -1),
        ("HuyLuot", "serviceTask", "Hủy lượt; lịch hẹn → vắng mặt", "Lane_TN", 7, 1),
        ("EndHuy", "endEvent", "Lượt bị hủy", "Lane_TN", 6, 1),
        ("XepHang", "serviceTask", "Xếp hàng đợi theo ưu tiên & giờ hẹn", "Lane_HT", 8, 0),
        ("GoiKham", "userTask", "Gọi bệnh nhân vào phòng (màn hình gọi số)", "Lane_BS", 9, 0),
        ("GwCoMat", "exclusiveGateway", "Có mặt?", "Lane_BS", 10, 0),
        ("QuaLuot", "serviceTask", "Qua lượt (xếp cuối hàng)", "Lane_HT", 10, 0),
        ("GwLan3", "exclusiveGateway", "Lần thứ 3?", "Lane_HT", 11, 0),
        ("EndVang", "endEvent", "Hủy lượt (vắng mặt)", "Lane_HT", 12, 0),
        ("Kham", "userTask", "Khám lâm sàng, sinh hiệu, chẩn đoán sơ bộ", "Lane_BS", 11, 0),
        ("GwCls", "exclusiveGateway", "Cần cận lâm sàng?", "Lane_BS", 12, 0),
        ("PhieuCls", "serviceTask", "Lập phiếu thu CLS, cấn trừ tạm ứng còn dư", "Lane_HT", 13, 0),
        ("GwPhiCls", "exclusiveGateway", "Còn phải thu?", "Lane_HT", 14, 0),
        ("ThuCls", "userTask", "Thu phí CLS (tại quầy / QR PayOS)", "Lane_TN", 15, 0),
        ("Cls", "userTask", "Lấy mẫu / thực hiện CLS, nhập kết quả, gửi bác sĩ", "Lane_KTV", 16, 0),
        ("KetLuan", "userTask", "Chẩn đoán ICD-10, kê đơn, kết thúc khám", "Lane_BS", 17, 0),
        ("LapHD", "serviceTask", "Lập hóa đơn gộp, trừ BHYT, cọc, tạm ứng, phí CLS đã thu", "Lane_HT", 18, 0),
        ("XacNhan", "userTask", "Xác nhận cách thanh toán; mua thuốc tại phòng khám hay mua ngoài", "Lane_BN", 19, 0),
        ("GwThuHoan", "exclusiveGateway", "Thu thêm / hoàn?", "Lane_TN", 20, 0),
        ("ThuThem", "userTask", "Thu thêm phần còn thiếu", "Lane_TN", 21, -1),
        ("HoanDu", "userTask", "Hoàn tiền dư cho bệnh nhân", "Lane_TN", 21, 1),
        ("GwGop", "exclusiveGateway", "", "Lane_TN", 22, 0),
        ("GwThuoc", "exclusiveGateway", "Mua thuốc tại phòng khám?", "Lane_NT", 23, 0),
        ("CapThuoc", "userTask", "Cấp phát thuốc theo đơn (lô hạn gần nhất trước)", "Lane_NT", 24, 0),
        ("End", "endEvent", "Hoàn thành lượt khám", "Lane_NT", 25, 0),
    ],
    boundaries=[("TimerTU", "Hết ngày vẫn chưa khám", "ThuTU")],
    flows=[
        ("Start", "GwHen", ""), ("GwHen", "CheckIn", "Có", "vh"), ("GwHen", "TaoLuot", "Không", "vh"),
        ("CheckIn", "CapSo", ""), ("TaoLuot", "CapSo", ""), ("CapSo", "GwCapCuu", ""),
        ("GwCapCuu", "TinhTU", "Không"), ("GwCapCuu", "XepHang", "Có", "bot:14:-30"),
        ("TinhTU", "GwConThu", ""), ("GwConThu", "ThuTU", "Có", "vh"),
        ("GwConThu", "XepHang", "Không (BHYT/cọc đủ)"), ("ThuTU", "XepHang", "Đã thu"),
        ("TimerTU", "HuyLuot", ""), ("HuyLuot", "EndHuy", ""),
        ("XepHang", "GoiKham", ""), ("GoiKham", "GwCoMat", ""),
        ("GwCoMat", "Kham", "Có"), ("GwCoMat", "QuaLuot", "Không"),
        ("QuaLuot", "GwLan3", ""), ("GwLan3", "EndVang", "Có"), ("GwLan3", "XepHang", "Không", "top:14:30"),
        ("Kham", "GwCls", ""), ("GwCls", "PhieuCls", "Có"), ("GwCls", "KetLuan", "Không", "bot:12:-30"),
        ("PhieuCls", "GwPhiCls", ""), ("GwPhiCls", "ThuCls", "Có"),
        ("GwPhiCls", "Cls", "Không (tạm ứng đủ / cấp cứu)", "vh"),
        ("ThuCls", "Cls", "Đã thu"), ("Cls", "KetLuan", "Có kết quả"),
        ("KetLuan", "LapHD", ""), ("LapHD", "XacNhan", ""), ("XacNhan", "GwThuHoan", ""),
        ("GwThuHoan", "ThuThem", "Thiếu", "vh"), ("GwThuHoan", "HoanDu", "Dư", "vh"), ("GwThuHoan", "GwGop", "Vừa đủ"),
        ("ThuThem", "GwGop", ""), ("HoanDu", "GwGop", ""), ("GwGop", "GwThuoc", ""),
        ("GwThuoc", "CapThuoc", "Có"), ("GwThuoc", "End", "Không (mua ngoài / không có đơn)", "bot:14:0"),
        ("CapThuoc", "End", ""),
    ],
    label_pos={"GwHen": "left", "GwThuHoan": "left", "GwConThu": "above", "GwPhiCls": "above",
               "GwThuoc": "above", "GwCls": "above", "End": "above", "TimerTU": "right"},
)

# ───────────────────────── 02. Đặt lịch, đặt cọc, hủy lịch ─────────────────────────
SPECS["02"] = dict(
    key="DatLich", title="Quy trình đặt lịch, đặt cọc, hủy lịch",
    lanes=[("Lane_BN", "Bệnh nhân", 220), ("Lane_HT", "Hệ thống", 220), ("Lane_PO", "Cổng thanh toán PayOS", 135),
           ("Lane_BS", "Bác sĩ", 135), ("Lane_GD", "Ban giám đốc", 135), ("Lane_TN", "Thu ngân", 220)],
    nodes=[
        ("Start", "startEvent", "Chọn bác sĩ, ngày, khung giờ", "Lane_BN", 0, 0),
        ("KtSlot", "serviceTask", "Kiểm tra khung giờ, khoảng ngày đặt trước, suất mỗi buổi", "Lane_HT", 1, 0),
        ("GwSuat", "exclusiveGateway", "Còn suất?", "Lane_HT", 2, 0),
        ("EndHet", "endEvent", "Báo \"Đã kín\", chọn giờ khác", "Lane_BN", 2, 0),
        ("GiuCho", "serviceTask", "Lập lịch \"chờ thanh toán\", giữ chỗ 15 phút", "Lane_HT", 3, 0),
        ("TraCoc", "userTask", "Thanh toán PayOS (trực tiếp: cọc theo cấu hình; trực tuyến: 100% phí)", "Lane_BN", 4, 0),
        ("HuyTT", "serviceTask", "Tự hủy lịch, nhả khung giờ", "Lane_HT", 4, 0),
        ("EndHuyTT", "endEvent", "Lịch hẹn bị hủy", "Lane_PO", 4, 0),
        ("XuLyTT", "serviceTask", "Xử lý giao dịch, gửi webhook (đối soát mỗi 60 giây)", "Lane_PO", 5, 0),
        ("XacNhan", "serviceTask", "Xác nhận lịch, lập hóa đơn cọc HDT…", "Lane_HT", 6, 0),
        ("NhacLich", "serviceTask", "Email nhắc lịch hẹn trong 24 giờ tới", "Lane_HT", 7, 0),
        ("GwHuy", "exclusiveGateway", "Có yêu cầu hủy?", "Lane_HT", 8, 0),
        ("GwHan", "exclusiveGateway", "Còn đủ thời hạn hủy (cấu hình)?", "Lane_BN", 9, 0),
        ("EndTuChoi", "endEvent", "Không hủy trực tuyến, không hoàn cọc", "Lane_BN", 9, 1),
        ("GhiTK", "userTask", "Hủy lịch, khai tài khoản nhận hoàn (cọc × % hoàn)", "Lane_BN", 10, 0),
        ("XinHuy", "userTask", "Gửi yêu cầu hủy ca (lịch → chờ duyệt hủy)", "Lane_BS", 9, 0),
        ("DuyetHuy", "userTask", "Duyệt yêu cầu hủy ca (từ chối → giữ lịch)", "Lane_GD", 10, 0),
        ("GwDen", "exclusiveGateway", "Đến check-in trong ngày hẹn?", "Lane_HT", 12, 0),
        ("EndOk", "endEvent", "Đến khám (quy trình 01)", "Lane_HT", 13, 0),
        ("EndKhongDen", "endEvent", "Hết ngày: hủy lịch, không hoàn cọc", "Lane_HT", 12, 1),
        ("HoanCoc", "userTask", "Hoàn cọc theo yêu cầu \"chờ hoàn\"", "Lane_TN", 14, -1),
        ("EndHoan", "endEvent", "Đã hoàn cọc", "Lane_TN", 15, -1),
    ],
    boundaries=[("TimerTT", "Hết 15 phút", "TraCoc"),
                ("TimerDuyet", "Chưa duyệt khi tới giờ hẹn → tự hủy", "DuyetHuy")],
    flows=[
        ("Start", "KtSlot", ""), ("KtSlot", "GwSuat", ""),
        ("GwSuat", "EndHet", "Không"), ("GwSuat", "GiuCho", "Có"),
        ("GiuCho", "TraCoc", "", "vh"), ("TraCoc", "XuLyTT", ""),
        ("TimerTT", "HuyTT", ""), ("HuyTT", "EndHuyTT", ""),
        ("XuLyTT", "XacNhan", "Thành công"), ("XacNhan", "NhacLich", ""), ("NhacLich", "GwHuy", ""),
        ("GwHuy", "GwHan", "Bệnh nhân hủy", "vh"), ("GwHuy", "XinHuy", "Bác sĩ xin hủy", "vh"),
        ("GwHuy", "GwDen", "Không"),
        ("GwHan", "GhiTK", "Có"), ("GwHan", "EndTuChoi", "Không"),
        ("GhiTK", "HoanCoc", "", "hv:-30"),
        ("XinHuy", "DuyetHuy", ""), ("DuyetHuy", "HoanCoc", "Duyệt", "hv:30"),
        ("TimerDuyet", "HoanCoc", "", "vh"),
        ("GwDen", "EndOk", "Có"), ("GwDen", "EndKhongDen", "Không"),
        ("HoanCoc", "EndHoan", ""),
    ],
    label_pos={"GwHan": "above", "GwHuy": "al", "TimerTT": "right", "TimerDuyet": "right",
               "EndHet": "above", "GwDen": "above", "EndKhongDen": "left"},
)

# ───────────────────────── 03. Tư vấn trực tuyến ─────────────────────────
SPECS["03"] = dict(
    key="TuVan", title="Quy trình tư vấn trực tuyến (video call)",
    lanes=[("Lane_BN", "Bệnh nhân", 135), ("Lane_HT", "Hệ thống", 230), ("Lane_BS", "Bác sĩ", 135),
           ("Lane_TN", "Thu ngân", 230)],
    nodes=[
        ("Start", "startEvent", "Lịch trực tuyến đã đóng 100% phí", "Lane_HT", 0, 0),
        ("MoPhong", "serviceTask", "Mở phòng gọi từ 15 phút trước giờ hẹn", "Lane_HT", 1, 0),
        ("GwSplit", "parallelGateway", "", "Lane_HT", 2, 0),
        ("BnVao", "userTask", "Vào phòng gọi (đăng nhập, kèm token)", "Lane_BN", 3, 0),
        ("BsVao", "userTask", "Vào phòng gọi (bác sĩ phụ trách, kèm token)", "Lane_BS", 3, 0),
        ("GhiVao", "serviceTask", "Ghi lúc từng bên vào phòng và lúc hai bên gặp nhau", "Lane_HT", 4, 0),
        ("GwGap", "exclusiveGateway", "Hai bên gặp nhau trước khi phòng đóng?", "Lane_HT", 5, 0),
        ("TuVan", "userTask", "Tư vấn video, chat / gửi tệp, nhập chẩn đoán & lời khuyên", "Lane_BS", 6, 0),
        ("GwKL", "exclusiveGateway", "Kết luận trong ngày hẹn?", "Lane_BS", 7, 0),
        ("TaoHs", "serviceTask", "Lưu hồ sơ bệnh án HSxxxxxx, lịch hoàn thành", "Lane_HT", 8, -1),
        ("EndOk", "endEvent", "Tư vấn hoàn tất", "Lane_HT", 9, -1),
        ("GwCase", "exclusiveGateway", "Ai đã vào phòng?", "Lane_HT", 10, 0),
        ("VangMat", "serviceTask", "Lịch → vắng mặt, không hoàn phí", "Lane_HT", 12, -1),
        ("EndVang", "endEvent", "Ca kết thúc (bệnh nhân vắng)", "Lane_HT", 13, -1),
        ("HoanYC", "serviceTask", "Hủy ca, tạo yêu cầu \"chờ hoàn\" phí", "Lane_HT", 12, 1),
        ("XacMinh", "userTask", "Xác minh nguyên nhân", "Lane_TN", 12, 0),
        ("GwXm", "exclusiveGateway", "Hoàn phí?", "Lane_TN", 13, 0),
        ("EndKhongHoan", "endEvent", "Không hoàn phí", "Lane_TN", 13, 1),
        ("HoanPhi", "userTask", "Hoàn phí cho bệnh nhân", "Lane_TN", 14, 0),
        ("EndHoan", "endEvent", "Đã hoàn phí", "Lane_TN", 15, 0),
    ],
    boundaries=[],
    flows=[
        ("Start", "MoPhong", ""), ("MoPhong", "GwSplit", ""),
        ("GwSplit", "BnVao", "", "vh"), ("GwSplit", "BsVao", "", "vh"),
        ("BnVao", "GhiVao", ""), ("BsVao", "GhiVao", ""), ("GhiVao", "GwGap", ""),
        ("GwGap", "TuVan", "Có", "vh"), ("GwGap", "GwCase", "Không (phòng đóng: giờ hẹn + 60 phút)"),
        ("TuVan", "GwKL", ""), ("GwKL", "TaoHs", "Có"),
        ("GwKL", "XacMinh", "Không (hết ngày hẹn)", "vh"),
        ("TaoHs", "EndOk", ""),
        ("GwCase", "VangMat", "Chỉ bác sĩ vào", "vh!"), ("GwCase", "HoanYC", "Bác sĩ không vào", "vh!"),
        ("GwCase", "XacMinh", "Cả hai vào nhưng lệch giờ", "rd!"),
        ("VangMat", "EndVang", ""), ("HoanYC", "HoanPhi", ""),
        ("XacMinh", "GwXm", ""), ("GwXm", "HoanPhi", "Có"), ("GwXm", "EndKhongHoan", "Không"),
        ("HoanPhi", "EndHoan", ""),
    ],
    label_pos={"GwGap": "above", "GwKL": "above", "GwCase": "left", "GwXm": "above",
               "Start": "above", "EndKhongHoan": "left"},
)


def build(spec):
    LANES, N, BND, F, LP = spec["lanes"], spec["nodes"], spec["boundaries"], spec["flows"], spec["label_pos"]
    key = spec["key"]
    lane_top, y = {}, 40
    for lid, _, h in LANES:
        lane_top[lid] = y
        y += h
    pool_h = y - 40
    lane_h = {l[0]: l[2] for l in LANES}
    lane_of = {n[0]: n[3] for n in N}

    box = {}
    for nid, typ, _, lane, col, row in N:
        cx = X0 + col * COLW
        top, h = lane_top[lane], lane_h[lane]
        cy = top + h / 2 + row * (h / 2 - TH / 2 - 15)
        w, hh = (TW, TH) if typ.endswith("Task") else (GW, GW) if "Gateway" in typ else (EV, EV)
        box[nid] = (cx - w / 2, cy - hh / 2, w, hh)
    for bid, _, att in BND:
        bx, by, bw, bh = box[att]
        box[bid] = (bx + bw - 50, by + bh - EV / 2, EV, EV)
        lane_of[bid] = lane_of[att]

    def mid(b):
        return b[0] + b[2] / 2, b[1] + b[3] / 2

    def route(s, t, mode):
        sb, tb = box[s], box[t]
        (sx, sy), (tx, ty) = mid(sb), mid(tb)
        kind, *arg = mode.rstrip("!").split(":")
        if kind == "vh":
            y0 = sb[1] + sb[3] if ty > sy else sb[1]
            return [(sx, y0), (sx, ty), (tb[0], ty)]
        if s in dict((b[0], 1) for b in BND):          # sự kiện biên: thẳng xuống
            return [(sx, sb[1] + sb[3]), (sx, tb[1])]
        if kind == "rd":
            x1 = sb[0] + sb[2] + 30
            return [(sb[0] + sb[2], sy), (x1, sy), (x1, ty), (tb[0], ty)]
        if kind in ("top", "bot"):
            d, off = float(arg[0]), float(arg[1])
            lane = lane_of[s]
            if kind == "top":
                cy = lane_top[lane] + d
                return [(sx, sb[1]), (sx, cy), (tx + off, cy), (tx + off, tb[1])]
            cy = lane_top[lane] + lane_h[lane] - d
            return [(sx, sb[1] + sb[3]), (sx, cy), (tx + off, cy), (tx + off, tb[1] + tb[3])]
        if abs(sy - ty) < 1:
            return [(sb[0] + sb[2], sy), (tb[0], ty)] if tx > sx else [(sb[0], sy), (tb[0] + tb[2], ty)]
        if abs(sx - tx) < 1:
            return [(sx, sb[1]), (tx, tb[1] + tb[3])] if ty < sy else [(sx, sb[1] + sb[3]), (tx, tb[1])]
        tx += float(arg[0]) if arg else 0
        end = (tx, tb[1] + tb[3]) if ty < sy else (tx, tb[1])
        return [(sb[0] + sb[2], sy), (tx, sy), end]

    f = lambda v: f"{v:g}"
    flows = [(f"Flow_{i}", fl[0], fl[1], fl[2], fl[3] if len(fl) > 3 else "hv") for i, fl in enumerate(F, 1)]
    ids = [n[0] for n in N] + [b[0] for b in BND]
    inc = {i: [] for i in ids}; outg = {i: [] for i in ids}
    for fid, s, t, *_ in flows:
        outg[s].append(fid); inc[t].append(fid)

    o = ['<?xml version="1.0" encoding="UTF-8"?>',
         '<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" '
         'xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" '
         f'xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Defs_{key}" targetNamespace="http://phongkham.local/bpmn">',
         f'  <bpmn:collaboration id="Collab_{key}">',
         f'    <bpmn:participant id="Pool_{key}" name="{escape(spec["title"])}" processRef="Process_{key}" />',
         '  </bpmn:collaboration>',
         f'  <bpmn:process id="Process_{key}" isExecutable="false">',
         f'    <bpmn:laneSet id="LaneSet_{key}">']
    for lid, name, _ in LANES:
        o.append(f'      <bpmn:lane id="{lid}" name="{escape(name)}">')
        o += [f'        <bpmn:flowNodeRef>{i}</bpmn:flowNodeRef>' for i in ids if lane_of[i] == lid]
        o.append('      </bpmn:lane>')
    o.append('    </bpmn:laneSet>')
    for nid, typ, name, *_ in N:
        o.append(f'    <bpmn:{typ} id="{nid}" name="{escape(name)}">')
        o += [f'      <bpmn:incoming>{x}</bpmn:incoming>' for x in inc[nid]]
        o += [f'      <bpmn:outgoing>{x}</bpmn:outgoing>' for x in outg[nid]]
        o.append(f'    </bpmn:{typ}>')
    for bid, name, att in BND:
        o += [f'    <bpmn:boundaryEvent id="{bid}" name="{escape(name)}" attachedToRef="{att}" cancelActivity="true">']
        o += [f'      <bpmn:outgoing>{x}</bpmn:outgoing>' for x in outg[bid]]
        o += [f'      <bpmn:timerEventDefinition id="{bid}_def" />', '    </bpmn:boundaryEvent>']
    for fid, s, t, lbl, _ in flows:
        o.append(f'    <bpmn:sequenceFlow id="{fid}" name="{escape(lbl)}" sourceRef="{s}" targetRef="{t}" />')
    o.append('  </bpmn:process>')

    maxcol = max(n[4] for n in N)
    W = X0 + maxcol * COLW + 130 - LANE_X
    o += [f'  <bpmndi:BPMNDiagram id="Diagram_{key}">',
          f'    <bpmndi:BPMNPlane id="Plane_{key}" bpmnElement="Collab_{key}">',
          f'      <bpmndi:BPMNShape id="Pool_{key}_di" bpmnElement="Pool_{key}" isHorizontal="true"><dc:Bounds x="{POOL_X}" y="40" width="{W + LANE_X - POOL_X}" height="{pool_h}" /></bpmndi:BPMNShape>']
    for lid, _, h in LANES:
        o.append(f'      <bpmndi:BPMNShape id="{lid}_di" bpmnElement="{lid}" isHorizontal="true"><dc:Bounds x="{LANE_X}" y="{lane_top[lid]}" width="{W}" height="{h}" /></bpmndi:BPMNShape>')

    def label(b, pos):
        x, y = b[0] + b[2] / 2 - 60, b[1] + b[3] + 4
        if pos == "above":
            y = b[1] - 31
        elif pos == "left":
            x, y = b[0] - 124, b[1] + b[3] / 2 - 13
        elif pos == "right":
            x, y = b[0] + b[2] + 4, b[1] + 4
        elif pos == "al":
            x, y = b[0] - 122, b[1] - 31
        elif pos == "br":
            x, y = b[0] + b[2] + 2, b[1] + b[3] - 4
        return f'<bpmndi:BPMNLabel><dc:Bounds x="{f(x)}" y="{f(y)}" width="120" height="27" /></bpmndi:BPMNLabel>'

    for nid, typ, name in [(n[0], n[1], n[2]) for n in N] + [(b[0], "boundaryEvent", b[1]) for b in BND]:
        b = box[nid]
        marker = ' isMarkerVisible="true"' if typ == "exclusiveGateway" else ""
        lbl = label(b, LP.get(nid, "below")) if (not typ.endswith("Task") and name) else ""
        o.append(f'      <bpmndi:BPMNShape id="{nid}_di" bpmnElement="{nid}"{marker}><dc:Bounds x="{f(b[0])}" y="{f(b[1])}" width="{f(b[2])}" height="{f(b[3])}" />{lbl}</bpmndi:BPMNShape>')
    for fid, s, t, lbl, mode in flows:
        pts = route(s, t, mode)
        wps = "".join(f'<di:waypoint x="{f(x)}" y="{f(y)}" />' for x, y in pts)
        lab = ""
        if lbl:
            seg = next(((a, b) for a, b in zip(pts, pts[1:]) if abs(a[1] - b[1]) < 1), None) if mode.endswith("!") else None
            (x1, y1), (x2, y2) = seg or (pts[0], pts[1])
            if abs(y1 - y2) < 1:   # đoạn ngang: nhãn phía trên, neo ở đầu đoạn
                lab = f'<bpmndi:BPMNLabel><dc:Bounds x="{f(min(x1, x2) + 6)}" y="{f(y1 - 30)}" width="{f(min(max(abs(x2 - x1) - 12, 60), 220))}" height="27" /></bpmndi:BPMNLabel>'
            else:
                lab = f'<bpmndi:BPMNLabel><dc:Bounds x="{f(x1 + 6)}" y="{f(min(y1, y2) + 4)}" width="120" height="27" /></bpmndi:BPMNLabel>'
        o.append(f'      <bpmndi:BPMNEdge id="{fid}_di" bpmnElement="{fid}">{wps}{lab}</bpmndi:BPMNEdge>')
    o += ['    </bpmndi:BPMNPlane>', '  </bpmndi:BPMNDiagram>', '</bpmn:definitions>', '']
    return "\n".join(o)


if __name__ == "__main__":
    which, out = sys.argv[1], sys.argv[2]
    open(out, "w", encoding="utf-8", newline="\n").write(build(SPECS[which]))
    print("ok", which, out)
