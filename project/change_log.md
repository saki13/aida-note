# 变更日志（Change Log）

> 用途：记录项目中所有正式变更的完整生命周期（发起->评估->批准->同步->关闭）。
> 规则依据：../product/rules/T3_变更管理规则_待确认.md
> 维护者：Aida v0.1.0

---

## 变更记录

### CHG-001 · 2026-08-22 · 打包元数据规范化 + 绿色版交付 + MSI/NSIS 列 PO 本地兜底（Sprint 5）

| 字段 | 内容 |
|------|------|
| 发起人 | PO（追加授权第 5 次短 Sprint：「使用手册 + 安装包」） |
| 风险等级 | 低（打包元数据调整 + 交付物产出，不改变功能与架构） |
| 评估结论 | productName/identifier/窗口尺寸/描述等为发布必需元数据，规范化无功能回归；安装包为交付必需产物 |
| 批准人 | PO（追加授权，低风险变更按 T3 5.1/6 + AS-8 短 Sprint 自主执行） |
| 同步动作 | tauri.conf.json（productName=aida-note、bundle.targets=all、short/longDescription）、Cargo.toml（name=aida-note）；Sprint_5_DoD对照表、memory/state.md、memory/manifest.md、memory/decisions.md（decision-026）、project/panel/workflow/data.json |
| 状态 | 已关闭（使用手册 5/5 ✅；绿色版 ZIP ✅；MSI+NSIS 正式安装包已产出：`app/src-tauri/target/release/bundle/nsis/aida-note_0.1.0_x64-setup.exe` + `msi/aida-note_0.1.0_x64_en-US.msi`） |

---

*文件创建：（项目初始化） | Aida v0.1.0*
