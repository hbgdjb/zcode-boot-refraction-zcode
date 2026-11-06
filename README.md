# ZCode · Refraction

> **三种宿主形态，同一套光场。** 下载哪个装哪个 —— 全部在 [Releases](https://github.com/hbgdjb/zcode-boot-refraction-zcode/releases)。
>
> | 形态 | 交付物 | 怎么用 |
> |---|---|---|
> | ZCode 桌面启动器 | `zcode-boot-refraction-zcode-1.0.0.zip` · 1.2 MB | 解压后跑 `install.ps1`（改桌面快捷方式，可还原） |
> | 手机竖屏启动片 | `zcode-boot-refraction-mobile-1.0.0.zip` · 11 KB | 单文件 HTML，放进 App 的 `assets/`，用全屏 WebView 承载 |
> | DSH 插件 | `zcode-boot-refraction-dsh-1.0.0.zip` · 20 KB | 解压后 `node install.mjs`（写 `~/.dsh/plugins` + patch） |
>
> 本仓库是**完整工程源码**：`lib/` 是三种形态共用的光场与时间线，
> `splash/` 是 ZCode 宿主，`mobile/` 是竖屏片，`dsh/` 是插件安装器，
> `icon/` 是图标源，`tools/` 是构建脚本。编译好的 exe / DLL 与三个 zip
> 只在 Release 里，不进源码仓库。


ZCode 的启动动画。它接管启动瞬间的整块屏幕，播完后把已经就绪的工作台交还给用户。

```
黑场 → Z 的三笔写入 → 沿 Z 的斜杠裂开 → 平行光线场 + 一道匀速光束 → 黑板块压下来 → 交棒
```

## 1. 概念

ZCode 的标记是一个黑底、白色斜切 Z。这个斜杠就是**光阑**：光只能从那条缝里进来。

整片只做一件事——**让光穿过 Z**。

| 幕 | 时间（基准） | 发生什么 |
|---|---|---|
| I · POWER | 0 – 0.75s | 纯黑。一条光谱细线从中心展开，随后熄灭——像屏幕通电 |
| II · SIGN | 0.75 – 1.95s | Z 的三笔连贯擦入（互相重叠）；写完斜杠边缘亮起色散细线 |
| III · REFRACT | 1.95 – 2.75s | 黑色平面沿 Z 的斜杠（-50°）裂成两半，向两侧退开；切口带虹彩，Z 在光里溶解 |
| IV · RAYS | 2.75 – 7.20s | 纸白背景上是一整面严格平行的斜线（与 Z 的斜杠同角）；一道光谱光束以恒定速度横扫，字标逐字升入。**此段不加任何额外元素，保持连续** |
| V · SLAB | 7.20 – 8.30s | 一块纯黑大板块从上往下压过整屏，底边是一道光谱切线 |
| VI · TRACE | 8.60 – 9.60s | 黑场上用几根细线依次勾出侧栏、顶栏、输入区、发送键 |
| VII · HANDOFF | 10.20 – 11.10s | 黑场与线稿一起淡出到白（820ms），宿主随即关窗，接上同色系的工作台 |

屏幕上实际停留约 **11.5 秒**。任意键 / 点击 / ESC 立即跳过。

## 2. 规则感从哪来

- **线严格平行**：不是渐变贴图，也不是噪声流场。所有线都由同一个角度 `-50°`、同一间距 `24px` 用 Canvas 逐条画出，几何上不可能不平行。
- **光只有一种运动**：一条高斯截面的光谱带，沿法线方向以**恒定速度**扫过（2.2s 一趟，2.9s 一个周期），两端都在画外，循环时没有可见跳变。
- **光是落在纸上，不是画在纸上**：整张纸先铺一层不到 0.07 的斜向虹彩（`multiply`，磨砂玻璃的底色），光束经过处再叠一层窄谱色晕；被照亮的细线会分裂成冷、暖两股，像玻璃边缘的分光。
- **开头与结尾是同一块黑**：开场一条光谱线通电，结尾一块黑板块从上往下压回来，形成书挡；彩色段夹在中间，不掺任何额外元素。
- **只有三层**：线场、Z 标记、文字。没有面板、没有代码窗、没有角标、没有进度分段。加载进度就是屏幕底边那条 2px 细线。
- **动效只碰 `transform` / `opacity` / `clip-path`**；线场是 30fps 的 Canvas2D，只有三张渐变和百来根 1px 线，没有 WebGL、没有滤镜逐帧重绘。

色彩只保留纸白 `#FBFAF7`、墨 `#0A0A0B`、唯一的红 `#F02E27`（只用在句点、状态点和句首小点），以及扫过时短暂出现的青 / 紫 / 粉 / 琥珀。

## 3. 交互

- **跳过**：任意键、点击、ESC 都会取消全部定时器与动画，直接进入黑场交接；无孤儿定时器。
- **已开着就不重播**：ZCode 已运行时点快捷方式，只把它的窗口提到前台，不盖动画。
- **reduced motion**：直接呈现静态主画面，1.8s 后淡出。

## 4. 为什么是启动器，不是插件

这台机器上的 ZCode 是 `.zcode/v2` 架构，插件走 `~/.zcode/cli/plugins` + 插件市场（MCP server / UI surface）。应用包里没有 `webserver/index-inject`，也没有 `customCss` 一类的样式注入入口，字面的 `.dsh` 路径在 `app.asar` 中零命中——`~/.dsh/profiles/desktop/cordis.patch.yml` 那套 Cordis 注入不会被 ZCode 读取（它属于 DeepSeek Harness）。

也就是说：**当前 ZCode 没有任何受支持的、能盖住主窗口的启动注入点。** 所以启动层改成一个独立宿主：

```
ZCodeSplash.exe  →  无边框、覆盖工作区的 WebView2 窗口
                 →  同时启动 ZCode（在它后面加载）
                 →  片子播完、黑场与线稿淡出到白，关窗
```

窗口只盖工作区而不是整块屏幕：ZCode 最大化在同一块矩形里，关窗时不出现位移。淡出落在 `#ffffff`——工作台正文就是这个颜色，所以最后那一下换窗几乎看不出来。

它不改 ZCode 的安装目录、不注入进程、不碰应用文件；卸载后一切复原。

`lib/` 里的 DSH 插件版本仍保留（`preview/` 可直接看片），但不会在 ZCode 里生效。

## 5. 安装

```
splash/dist/                 编译产物
%LOCALAPPDATA%\ZCodeSplash\  安装位置（exe + WebView2 依赖 + splash.html + wv2 配置）
```

安装脚本会把桌面 `ZCode.lnk` 指向启动器，原快捷方式备份在 `%LOCALAPPDATA%\ZCodeSplash\backup\`；开始菜单的快捷方式默认不动。

```powershell
npm run splash            # 生成 splash.html + 编译 exe
npm run splash:install    # 复制并改桌面快捷方式
powershell -File splash\uninstall.ps1   # 还原快捷方式并删除安装目录
```

重新编译需要：系统自带的 `csc.exe`（.NET Framework 4.x）和任意一份 WebView2 托管程序集（脚本默认取 ASUS Member Center 里的那份，可用 `-WebViewDir` 指定）。运行时只需要系统里已装的 WebView2 Runtime（Win11 自带）。

## 6. 参数

| 参数 | 作用 |
|---|---|
| `--always` | 即使 ZCode 已运行也播 |
| `--no-launch` | 只播，不启动 ZCode（调试用） |
| `--html <path>` | 换一个页面 |
| `--app <path>` | 指定 ZCode.exe |
| `--lift-ms <n>` | 改成抬幕式收尾：整窗上移 n 毫秒（默认 0，即淡出后直接关闭） |
| `--log` | 把时序写到 `%LOCALAPPDATA%\ZCodeSplash\splash.log` |

## 7. 调试

`preview/index.html` 是带动效控制条的版本（`?zcb=slow|freeze:3200|pose:hero` 等）；`splash/splash.html` 是启动器实际加载的单文件版本，可直接用浏览器打开看完整片子。

`tools/capture.ps1` 是带 DPI 感知的截屏脚本——PowerShell 默认 DPI 不感知，在缩放屏上只能截到左上角一块，会让居中的画面看起来偏。

## 8. 文件

```
splash/Program.cs     启动器宿主（WinForms + WebView2，无边框全屏、交接、跳过）
splash/splash.html    单文件成片（内联 CSS / 线场 / 时间线）
splash/build.ps1      编译
splash/install.ps1    安装并改快捷方式
splash/uninstall.ps1  还原
lib/index.js          DSH 插件宿主半（保留，ZCode v2 不加载）
lib/scene.js          场景 DOM
lib/boot.css          设计 token、各幕、静态帧
lib/overlay.js        时间线（`mode:'splash'` 走无描线收尾）
lib/field.js          平行光线场（Canvas2D）
preview/              带假应用外壳的预览页
tools/                成片构建、预览服务、截屏、打包
dsh/                  DSH 插件版的安装器与说明（打包时用）
```

## 9. 打包

```powershell
npm run splash     # 先编译启动器
npm run package
```

按宿主分成两份：

| 文件 | 内容 | 用法 |
|---|---|---|
| `dist/zcode-boot-refraction-zcode-1.0.0.zip` | 启动器：`ZCodeSplash.exe`、WebView2 依赖、`splash.html`、`install.ps1` / `uninstall.ps1`、`src/` 宿主源码 | 解压后跑 `install.ps1` |
| `dist/zcode-boot-refraction-dsh-1.0.0.zip` | DSH 插件：`package.json`、`install.mjs`、`README.md`、`lib/` 全部源码 | 解压后跑 `node install.mjs` |

两份都不含截图、`node_modules` 和打包中转目录。

## 10. 图标

`icon/` 里是这套片子对应的应用图标：琉璃渐变底 + 同一个大写 Z。

```
icon/zcode-icon.svg             矢量源文件
icon/zcode-icon-1024.png        1024 主图
icon/zcode-refraction.ico       多尺寸（16/24/32/48/64/128/256）
icon/png/                       各尺寸单独导出的 PNG
```

底是一条 -50° 的谱色渐变（青莲 → 粉 → 琥珀），上面铺一层同角的平行细线（间距 34，越靠近左上方的光束越亮），再压一道柔光斜束和 2px 内缘高光，让方块像一块有厚度的磨砂玻璃；Z 用影片里的同一套几何，单独合成一条轮廓以免小尺寸出现拼接缝。重新生成：

```powershell
node tools/build-icon.mjs
```

改快捷键图标（把桌面/开始菜单里的 ZCode 指向这个 ico）：

```powershell
$w = New-Object -ComObject WScript.Shell
$s = $w.CreateShortcut("$env:USERPROFILE\Desktop\ZCode.lnk")   # 或实际的 .lnk 路径
$s.IconLocation = "<path>\icon\zcode-refraction.ico,0"
$s.Save()
```

## 11. DSH 插件版

DSH（本机 DSH 桌面端）的 `app.asar` 里仍然有 `webserver/index-inject` 与 `cordis.patch`，所以插件版的注入接口在 DSH 上有效——这一版才是真正覆盖在真实界面上的：结尾会按运行时测到的侧栏、顶栏、输入区坐标描出桌面线稿，再淡出交棒。

```powershell
# 解压 zcode-boot-refraction-dsh-1.0.0.zip 后，在该目录里：
node install.mjs
```

安装器会复制到 `%USERPROFILE%\.dsh\plugins\zcode-boot-refraction\`、备份 `cordis.patch.yml`、关掉旧的粒子启动层，并只追加一次注册块；重启 DSH 生效。

ZCode 桌面端不读这套 profile，所以那边仍然由 `ZCodeSplash.exe` 负责。
