# ZCode · Refraction — ZCode 启动器版

ZCode 的启动动画，做成一个独立的启动层：无边框、全屏、置顶的 WebView2 窗口先盖住屏幕，同时把 ZCode 在它后面拉起来；片子播完、确认 ZCode 主窗口出现后自己关闭，露出已经就绪的工作台。

```
黑场 → Z 的三笔写入 → 沿 Z 的斜杠裂开 → 平行光线场 + 一道匀速光束 → 黑板块压下来 → 交棒
```

屏幕上约 11 秒，任意键 / 点击 / ESC 立即跳过。

## 为什么不是 ZCode 插件

ZCode 桌面端（`.zcode/v2`）的插件走插件市场（MCP server / 会话内 UI surface），宿主的 `app.asar` 里没有 `webserver/index-inject`，也没有用户样式注入入口——没有任何受支持的、能盖住主窗口的启动注入点。所以这一版做成启动器：不注入进程、不改应用文件、卸载即复原。

## 包内容

```
ZCodeSplash.exe                启动器宿主（WinForms + WebView2）
splash.html                    成片（单文件，内联 CSS / 线场 / 时间线）
Microsoft.Web.WebView2.*.dll   WebView2 托管程序集
WebView2Loader.dll
install.ps1 / uninstall.ps1    安装 / 还原
src/                           宿主源码（Program.cs、manifest、构建脚本、成片副本）
```

运行时只需要系统里已装的 WebView2 Runtime（Windows 11 自带）。

## 安装

```powershell
powershell -ExecutionPolicy Bypass -File install.ps1
```

它会：

1. 把启动器复制到 `%LOCALAPPDATA%\ZCodeSplash\`
2. 备份桌面 `ZCode.lnk` 到 `%LOCALAPPDATA%\ZCodeSplash\backup\`
3. 把桌面 `ZCode.lnk` 指向启动器（图标仍用 ZCode 的）

开始菜单的快捷方式不动；要一起改，加 `-StartMenu`。

之后从桌面图标启动：ZCode 没开 → 先播片子再进应用；ZCode 已经开着 → 只把窗口提到前台，不重播。

## 卸载

```powershell
powershell -ExecutionPolicy Bypass -File uninstall.ps1
```

还原快捷方式（取最近一次备份）并删除 `%LOCALAPPDATA%\ZCodeSplash\`。

## 参数

| 参数 | 作用 |
|---|---|
| `--always` | 即使 ZCode 已运行也播 |
| `--no-launch` | 只播，不启动 ZCode（调试用） |
| `--html <path>` | 换一个页面 |
| `--app <path>` | 指定 ZCode.exe |

## 重新编译

`src/` 里是完整宿主源码。需要系统自带的 `csc.exe`（.NET Framework 4.x）和一份 WebView2 托管程序集：

```powershell
powershell -ExecutionPolicy Bypass -File src\build.ps1 -WebViewDir "C:\path\to\WebView2"
```

产物在 `src\dist\`。成片本身的源码（`lib/field.js`、`boot.css`、`overlay.js`）在完整工程里；这个包只带构建好的 `splash.html`。

---

## 这个仓库

同一套光场有两种宿主形态，本仓库放的是**完整工程源码**（两个宿主共用 `lib/` 里的光场与时间线）：

| | |
|---|---|
| 本仓库 | ZCode 启动器（`ZCodeSplash.exe` + WebView2 全屏置顶窗口） |
| DSH 插件版 | 同一套光场的另一种形态（Cordis 插件注入首屏），源码在 `lib/` 与 `dsh/`，本次未单独建仓库 |
| 安装包 | [Releases](https://github.com/hbgdjb/zcode-boot-refraction-zcode/releases) 里的 `zcode-boot-refraction-zcode-1.0.0.zip` |

两份 zip 各自独立可交付：解压、跑安装脚本，互不依赖。差别只在交付形态 ——
启动器版结尾是黑场淡出；DSH 版覆盖真实界面，结尾还会按运行时测到的侧栏、顶栏、
输入区坐标描出桌面线稿再交棒。

仓库里**不含**编译好的 `ZCodeSplash.exe` 与 WebView2 程序集（二进制不进源码仓库），
它们只在 Release 的 zip 里。要从源码重建：

```bat
npm run splash            :: 生成 splash.html 并用 csc 编译宿主（需要 WebView2 程序集，见上文）
npm run splash:install    :: 复制到 %LOCALAPPDATA%\ZCodeSplash 并改桌面快捷方式
```

> `tools/package.mjs` 会把两份 zip 一起打出来 —— 打包脚本按「完整工程」写，
> 所以本仓库也带着另一半宿主的源码。只发自己那份即可。

工程的设计说明（分幕、规则感、参数、调试）见 [DESIGN.md](DESIGN.md)。
