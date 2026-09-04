# Kế hoạch thi hành · `settings`

**Liên quan:** [`design.md`](design.md) · FR-17 · FR-23 → FR-30 · FR-42 → FR-44

- [x] **1.** `settings/types.ts`: shape, mặc định, `migrateSettings` kẹp + rơi về mặc định.
- [x] **2.** `storage/local.ts` + test: schemaVersion, rác, bị chặn, hết quota.
- [x] **3.** engine: `gravityScale` + `fixedCellsPerSecond`, `effectiveGravity/SoftDrop` + test.
- [x] **4.** `Replay` mang `cfg` (ADR-0013).
- [x] **5.** `audio/` + test: SFX tự sinh, bật/tắt, âm lượng, chịu được không có Web Audio.
- [x] **6.** `settings/index.tsx`: context, load async, `settingsToConfig`.
- [x] **7.** `ui/SettingsScreen.tsx`: độ khó, tốc độ, DAS/ARR, keybind, hiển thị, âm thanh, ngôn ngữ, khôi phục mặc định.
- [x] **8.** Nối: `main.tsx`, `PlayScreen`, `useGameSession`, sprite chế độ không màu, ghost bật/tắt.
- [x] **9.** CSS, i18n hai locale cùng tập key.
- [x] **10.** Test xanh · typecheck · build · xem app thật.
- [x] **11.** ADR-0013 · scope FR · README.
- [ ] **12.** Commit, PR, merge, dọn worktree.
