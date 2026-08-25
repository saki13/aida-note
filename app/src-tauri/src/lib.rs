// SIS-OPT-4：Windows Shell 集成（HKCU 右键菜单 + 文本扩展名文件关联 + 启动 argv 打开）
// + OPT-4-FIX（Sprint 7 收口后 PO 反馈）：单实例合并窗口。
//
// 依据 ARCH-1「Rust 最小化」：文件系统操作全部走官方插件（fs/dialog/store），
// 本文件仅增加 Shell 集成（winreg 写 HKCU，幂等）、启动文件参数收集、单实例合并三个能力。
// 注册时机：应用启动 setup 自动执行；浏览器 dev 环境（无 Tauri）不注册。

use std::path::Path;

use tauri::Emitter;

/// 关联的文本扩展名清单（双击直接用 aida-note 打开）。
const EXTENSIONS: &[&str] = &["md", "txt", "log", "json", "yaml", "yml", "ini", "toml", "csv"];

/// 注册 HKCU Shell 集成（幂等：重复启动/重复调用不产生重复项，直接覆盖）。
/// 1) 任意文件右键菜单：HKCU\Software\Classes\*\shell\aida-note -> 用 aida-note 打开
/// 2) 各扩展名 ProgID：HKCU\Software\Classes\aida-note.<ext> + .<ext> 默认值
fn register_shell_integration(exe_path: &str) -> Result<(), Box<dyn std::error::Error>> {
    use winreg::enums::*;
    use winreg::RegKey;
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);

    // ---- ① 右键菜单（任意文件）----
    let (shell, _) = hkcu.create_subkey(r"Software\Classes\*\shell\aida-note")?;
    shell.set_value("", &"用 aida-note 打开".to_string())?;
    shell.set_value("Icon", &format!("\"{}\",0", exe_path).to_string())?;
    let (command, _) = shell.create_subkey("command")?;
    command.set_value("", &format!("\"{}\" \"%1\"", exe_path).to_string())?;

    // ---- ② 文件关联（扩展名 ProgID + 扩展名默认值）----
    for ext in EXTENSIONS {
        let prog_id = format!("aida-note.{}", ext);
        let (prog, _) = hkcu.create_subkey(format!(r"Software\Classes\{}", prog_id))?;
        prog.set_value("", &format!("aida-note {} 文件", ext).to_string())?;
        let (open, _) = prog.create_subkey(r"shell\open\command")?;
        open.set_value("", &format!("\"{}\" \"%1\"", exe_path).to_string())?;
        let (ext_key, _) = hkcu.create_subkey(format!(r"Software\Classes\.{}", ext))?;
        ext_key.set_value("", &prog_id.to_string())?;
    }
    Ok(())
}

/// 收集启动命令行中的文件路径参数（存在且为文件的参数；过滤 CLI 选项与 dev 附加参数）。
fn collect_launch_files() -> Vec<String> {
    std::env::args()
        .skip(1)
        .filter(|a| {
            if a.starts_with("-") {
                return false;
            }
            Path::new(a).is_file()
        })
        .collect()
}

/// 从 argv 中过滤出文件路径参数（单实例转发的载荷同样过滤，语义与 collect_launch_files 一致）。
fn filter_file_args(argv: &[String]) -> Vec<String> {
    argv.iter()
        .filter(|a| {
            if a.starts_with("-") {
                return false;
            }
            Path::new(a).is_file()
        })
        .cloned()
        .collect()
}

/// 前端启动时拉取本次启动的文件参数（Tauri 环境；浏览器 dev 返回空）。
#[tauri::command]
fn get_launch_args() -> Vec<String> {
    collect_launch_files()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        // OPT-4-FIX：单实例合并窗口。第二实例不再新开窗口，而是把 argv 转交主实例，
        // 主实例以「aida-open-files」事件推给前端 -> openPath 打开为标签（同路径自动去重激活）。
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            let files = filter_file_args(&argv);
            if !files.is_empty() {
                let _ = app.emit("aida-open-files", files);
            }
        }))
        .invoke_handler(tauri::generate_handler![get_launch_args])
        .setup(|_app| {
            // 启动即注册（幂等）；失败仅记录日志，不阻塞启动
            if let Some(exe) = std::env::current_exe().ok() {
                if let Some(exe_str) = exe.to_str() {
                    if let Err(e) = register_shell_integration(exe_str) {
                        eprintln!("[aida-note] shell integration 注册失败: {}", e);
                    }
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
