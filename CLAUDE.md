# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Khởi động phiên làm việc

Hook `SessionStart` trong [.claude/settings.json](.claude/settings.json) tự đánh thức 4 service Render (backend, ai, python-ml, office) ở chế độ nền khi mở phiên — không cần làm tay.

## Project

Outpatient clinic management system (graduation thesis). Workflow follows QĐ 1313/QĐ-BYT; BHYT rules follow Luật BHYT + NĐ 146/2018. Business rules (queue priority, prepay-before-exam, BHYT, refunds) are in [docs/QUY_TRINH_KHAM_BENH.md](docs/QUY_TRINH_KHAM_BENH.md) — read it before touching `tiep-nhan`, `thanh-toan` or `lich-hen`. Domain names (modules, tables, columns, variables) are Vietnamese without diacritics (`benh_nhan`, `tiep_nhan`, `maBenhNhanTiepTheo`); keep that convention.

## Commands

| Part | Dev | Build / check |
|---|---|---|
| `backend/` (NestJS 10, :5000, Swagger `/api/docs`) | `npm run start:dev` | `npm run build`, `npm run lint` |
| `frontend/` (React 18 + Vite, :3000) | `npm run dev` | `npm run build`, `npm run lint` |
| `ai-service/` (:5002), `office-service/` (:5003) | `npm run build && npm run start:dev` (plain `tsc`, no watch) | `npm run build`; ai-service: `npm run test:chat` |
| `python-ml/` (FastAPI, :5001) | `python -m uvicorn main:app --reload --port 5001` | `python -m pytest tests -q` (single: `pytest tests/test_ml.py::<name>`) |
| `mobile-patient/` (Expo) | `npm start` | — |
| `zalo-mini-app/` (Zalo Mini App, zmp-sdk + Vite) | `npm run dev` (browser, Zalo APIs stubbed) / `npm start` (zmp simulator) | `npm run build` (outputs to `www/`), `zmp deploy` |

- There is no JS unit-test suite. Verify Node changes with `npm run build`; API test cases are in `scripts/*.postman_collection.json`. CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) builds all four Node projects, runs python-ml `pytest`, and validates `deploy/docker-compose.staging.yml`.
- Frontend `npm run build` runs `prebuild` = eslint with `--max-warnings 0` first, so any lint warning fails the build.
- backend/ai-service/office-service are separate npm projects (no root workspace); ai/office `start:dev` does not watch — rebuild after each edit.
- python-ml cannot run in the local Windows venv (Application Control blocks scikit-learn/statsmodels DLLs) — run/test it in Docker. The image doesn't contain `tests/`, so mount the folder: `docker build -t python-ml python-ml` then `docker run --rm -v "$PWD/python-ml:/app" python-ml sh -c "pip install -q pytest httpx && python -m pytest tests -q"`.

## Architecture

- **backend** is the only service the frontend/mobile talk to: REST under `/api` + Socket.IO. It proxies to `ai-service` (Gemini chatbot/RAG/triage), `office-service` (staff chat) and `python-ml` (visit forecast, specialty classifier, face verification). Render services cold-start, so calls to them go through `common/utils/cold-start-retry.util.ts` / `python-ml-url.util.ts`.
- **Service-to-service auth:** downstream services trust only the backend. ai-service and python-ml check header `x-internal-key` = `AI_INTERNAL_KEY`; office-service checks `x-internal-token` = `OFFICE_INTERNAL_TOKEN` (`office-service/src/common/internal-auth.ts`) and trusts `x-user-id` only from the backend. Its Socket.IO authenticates with the backend's JWT (`JWT_SECRET`), and every room action checks membership. Set the same key on both sides, or calls fail with 401/503.
- **Response envelope:** `ResponseTransformInterceptor` wraps every response, so the frontend reads `response.data.data`. Errors go through `HttpExceptionFilter`. `AuditLogInterceptor` (global) writes the audit log.
- **Auth:** JWT access + refresh tokens with a per-user token version (revocation). Guards are applied per controller: `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(...)`; `@Public()` opts out. Patient endpoints must check ownership (`common/utils/benh-nhan-so-huu.util.ts`) to avoid IDOR.
- **Sensitive columns** are encrypted with `Aes256Transformer` (`APP_ENCRYPTION_KEY`); ai-service has its own copy of the transformer — keep them in sync.
- **Multi-instance safety:** generated codes (BN…, queue numbers, receipts) come from the `bo_dem_ma` counter table locked with `FOR UPDATE` (`common/utils/db-sequence.util.ts`, `ma-generator.util.ts`). Never generate codes with `MAX()+1` or random numbers.
- **DB pool:** `DB_POOL_LIMIT` (default 10, `app.module.ts`) must not be set to 2 on Render — together with `GET_LOCK` usage it deadlocks the pool; check pool stats at `/api/health`.
- **Timezone:** everything runs in Asia/Ho_Chi_Minh; the DB session timezone is set in `vn-session-timezone.util.ts`.
- **Real-time queue:** `modules/tiep-nhan/queue.gateway.ts` pushes queue changes to reception, doctor, kiosk and TV screens.
- **Zalo Mini App** is a second patient client that reuses the backend's patient APIs (own fetch client + token refresh in `zalo-mini-app/src/lib/api.js`). Its only dedicated endpoint is `POST /api/auth/zalo` (`auth.service.ts`). Zalo's Graph API only answers Vietnamese IPs, so Render reaches it through `tools/zalo-relay` (`ZALO_GRAPH_BASE_URL` + `ZALO_RELAY_KEY`). ZNS messages are sent from `thong-bao/zalo-zns.service.ts`. CORS for Zalo origins is set via `ZALO_MINI_APP_ORIGINS`. Setup: [zalo-mini-app/README.md](zalo-mini-app/README.md).
- **Frontend:** routes per role in `src/App.jsx` (lazy pages under `src/pages/<Role>`); axios instance in `src/services/api.js` handles token refresh; state in Zustand (`src/store`) + TanStack Query.

## Database & deployment

- Local DB: base schema `database/phong_kham.sql` (MySQL 8), or `database/phong_kham_full_test_data.sql` for schema + sample data; then apply any dated migrations it doesn't include yet. (`database/README_import.md` still refers to an old `schema.sql` that no longer exists.)
- TypeORM runs with `synchronize: false`. Schema changes = a new dated file `database/YYYYMMDD_<name>.sql` (`*.sql` is git-ignored → `git add -f`). Write plain `ALTER TABLE` statements: the Clever Cloud user cannot read `information_schema`.
- Production: backend + ai/office/python-ml on Render (auto-deploy on push to `main`), frontend on cPanel (upload `frontend/dist`, keep `.htaccess`), MySQL on Clever Cloud. Migrations are run by hand in phpMyAdmin **before** pushing code that uses new columns.

## Viết tài liệu / báo cáo đồ án

- Bổ sung vào tài liệu đã có ([SRS.md](SRS.md), [docs/QUY_TRINH_KHAM_BENH.md](docs/QUY_TRINH_KHAM_BENH.md), `docs/bpmn`), không viết lại từ đầu. Bản nháp đặt ở `docs/tai-lieu/` (`00_dan_y.md` = dàn ý, `00_mau.md` = mẫu cho mỗi luồng, `NN_<luong>.md` = từng luồng).
- Viết theo hành trình bệnh nhân: `lich-hen` → `tiep-nhan`/`kiosk` → tạm ứng (`thanh-toan`, `payos`) → khám (`ho-so-benh-an`) → CLS (`xet-nghiem`) → kê đơn → thanh toán cuối → `nha-thuoc` → `thong-bao`/`danh-gia`; sau đó mới đến các phần hỗ trợ (`quan-ly`, `nhan-vien`, `cham-cong`, `office`, `ai`).
- Mẫu mỗi luồng: mục đích, tác nhân, các bước, trạng thái (`trang_thai`), API + `@Roles`, bảng dữ liệu, quy tắc nghiệp vụ, sơ đồ sequence.
- Code là chuẩn: mỗi khẳng định ghi kèm `file:dòng`. Chỗ code khác `QUY_TRINH_KHAM_BENH.md` thì ghi vào mục "Chênh lệch" cuối file, không tự sửa code hay quy trình.
- Cấu trúc báo cáo: 1 Tổng quan · 2 Cơ sở lý thuyết và công nghệ · 3 Phân tích thiết kế (use case, activity/BPMN, sequence, ERD, sơ đồ trạng thái) · 4 Cài đặt và kiểm thử · 5 Kết luận.
- Sơ đồ BPMN trong `docs/bpmn` được sinh từ `docs/bpmn/tools/gen_bpmn.py` (sửa nút/luồng trong `SPECS`, không sửa tay file `.bpmn`), xuất PNG bằng `node render.mjs` (cần `npm install` trong thư mục đó và Chrome). Sơ đồ khác viết bằng Mermaid/PlantUML. ERD lấy bằng Grep `CREATE TABLE`/`FOREIGN KEY` trong `database/phong_kham.sql`, không đọc cả file.
- Tiết kiệm token: mỗi phiên một luồng rồi `/clear`; lấy thông tin bằng Grep (`@Get|@Post|@Roles|trang_thai`) thay vì đọc cả file, nhất là `quan-ly.service.ts` (hơn 4.000 dòng); viết Markdown, cuối cùng mới chuyển sang Word bằng `pandoc`.

## Working guidelines

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

Việc lớn (sửa hơn 1 file) thì viết ra phương án rồi để tôi xác nhận mới làm; việc nhỏ làm luôn.
Làm xong cái nào xóa code dư thừa ,tối ưu code 
backend chạy trên render,frontend chạy trên cpanel ,database trên clever
chỉ làm trên bản web; `mobile-patient` và `zalo-mini-app` chỉ là hướng phát triển (ghi trong đồ án), không sửa và không đưa vào phạm vi tài liệu
## 5. Tiết kiệm token

**Claude phải làm:**
- Đọc đúng file/đoạn cần thiết (dùng offset/limit, Grep trước khi Read). Không đọc lại file vừa sửa.
- Không đọc `node_modules/`, `frontend/dist/`, `*.zip`, file build, log dài.
- Không gọi subagent nếu tự làm được bằng Grep/Read.
- Trả lời ngắn gọn, đi thẳng vào việc; không nhắc lại những gì đã nói.
- Khi user đổi sang việc khác hẳn, nhắc user gõ `/clear`; phiên quá dài thì nhắc `/compact`.
-những cái chức năng nào thay đổi phải chỉnh lại ở file chính readme.md.
**Nhắc nhanh cho user:**
- Một việc một phiên → `/clear` khi xong.
- Chỉ rõ file bằng `@đường/dẫn`, tên hàm, tiêu chí "xong là gì".
- Gom nhiều sửa nhỏ vào một tin nhắn; chỉ dán phần log lỗi liên quan.
- Sai hướng → `Esc` dừng ngay; `Esc Esc` / `/rewind` để quay lại.
- `/model`: Sonnet cho việc thường, Opus cho việc khó. Việc lớn dùng Plan mode (`Shift+Tab`).
- `/context`, `/cost` để xem mức dùng token.