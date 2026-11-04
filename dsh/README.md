# ZCode · Refraction — DSH 插件版

ZCode 的启动动画，以 DSH 桌面客户端的 Cordis 插件形式注入 web 客户端首屏。

它接管启动瞬间的整块屏幕：外壳挂载时由这一层覆盖，播完后整层淡出，把已经就绪的工作台交还给用户。和独立启动器（`ZCodeSplash.exe`）不同，这个版本覆盖在**真实界面**上，所以结尾可以用运行时测到的侧栏、顶栏、输入区坐标描出桌面线稿，再交棒。

```
黑场 → Z 的三笔写入 → 沿 Z 的斜杠裂开 → 平行光线场 + 一道匀速光束 → 黑板块压下来 → 桌面线稿 → 交棒
```

## 安装

在解压后的目录里执行：

```powershell
node install.mjs
```

它会：

1. 把本包复制到 `%USERPROFILE%\.dsh\plugins\zcode-boot-refraction\`
2. 备份 `%USERPROFILE%\.dsh\profiles\desktop\cordis.patch.yml`
3. 把原来的 `dsh-boot-particles` 条目设为 `enabled: false`（两层同时注入会互相抢屏）
4. 追加一次 `zcode-boot-refraction` 的 insert 块

然后重启 DSH。重复执行不会产生重复条目。

## 配置

```yaml
- insert:
    - id: zcode-boot-refraction
      name: "file:///C:/Users/<you>/.dsh/plugins/zcode-boot-refraction/lib/index.js"
      config:
        enabled: true
        overlay: true
        playOncePerSession: true
```

| 字段 | 默认 | 说明 |
|---|---|---|
| `enabled` | `true` | 总开关 |
| `overlay` | `true` | 是否注入启动层 |
| `playOncePerSession` | `true` | 同一会话只播一次；设为 `false` 便于反复调试 |

## 调试参数（加在应用 URL 上）

| 参数 | 作用 |
|---|---|
| `?zcb=off` | 本次不播 |
| `?zcb=only` | 播完停在主画面，不交棒 |
| `?zcb=slow` | 2.2 倍慢放 |
| `?zcb=still` | 直接定格在完整主画面 |
| `?zcb=freeze:1500` | 播到 1500ms 时整层暂停 |
| `?zcb=pose:sign` | 无补间摆出 Z 完成态（黑场） |
| `?zcb=pose:hero` | 无补间直接摆出主画面 |
| `?zcb=pose:slab` | 无补间摆出黑色板块 |
| `?zcb=pose:exit` | 无补间摆出黑色板块上的桌面线稿 |

## 卸载

删除 `%USERPROFILE%\.dsh\plugins\zcode-boot-refraction\`，并从 `cordis.patch.yml` 里移除 `zcode-init-refraction` 那一段；如需恢复粒子启动层，把 `dsh-boot-particles` 的 `enabled` 改回 `true`。

## 结构

```
lib/index.js   宿主半：注入 style / markup / 单段 script（webserver/index-inject）
lib/scene.js   场景 DOM（与预览共用同一份字符串）
lib/boot.css   设计 token、各幕、响应式、静态帧
lib/overlay.js 时间线、跳过、桌面线稿、交棒
lib/field.js   平行光线场（Canvas2D，光谱晕染 + 色散分光）
```

线严格平行（同一角度 -50°、同一间距 24px 逐条画）；彩色段只有一道匀速光束，不加任何额外元素。

## 注意

这个包只对 **DSH** 生效。ZCode 桌面端（`.zcode/v2`）不加载 `~/.dsh/profiles` 下的 Cordis 插件——那台机器上的启动动画由独立启动器 `ZCodeSplash.exe` 负责。
