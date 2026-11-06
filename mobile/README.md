# ZCode · Refraction — 手机版

竖屏启动片，同一套光场与标记，节奏压到约 8 秒。手指点一下、任意键、或页面结束都会退出。

```
黑场 → Z 三笔写入 → 沿斜杠裂开 → 平行光线场 + 光谱光束 → 黑板块压下 → 勾出手机界面 → 淡出到白
```

## 文件

```
splash-mobile.html   单文件成片（内联 CSS / 线场 / 时间线），直接打开就能看
controller.js        竖屏时间线与手机界面的描线逻辑（构建源）
mobile.css           竖屏尺寸修正（构建源）
```

改完源码后重新生成：

```powershell
node tools/build-mobile.mjs
```

## 时间线

| 幕 | 时间 | 发生什么 |
|---|---|---|
| 通电 | 0 – 0.6s | 黑场，一条光谱线亮起又熄 |
| 写 Z | 0.6 – 1.5s | 三笔连贯写入，斜杠边缘亮起色散 |
| 裂开 | 1.5 – 2.15s | 黑面沿 -50° 分开，Z 在光里溶解 |
| 光线 | 2.15 – 4.95s | 纸白底线场 + 一道匀速光谱光束，字标升起 |
| 黑板块 | 4.95 – 6.05s | 纯黑板块自上而下压满 |
| 勾线 | 6.25 – 7.35s | 顶栏、品牌、输入区、发送键用细线勾出 |
| 交接 | 7.35 – 8.2s | 黑场与线稿淡出到白 |

任意触摸 / 按键立即跳过。

## 在浏览器里看

直接打开 `splash-mobile.html`。调试姿态：

| 参数 | 作用 |
|---|---|
| `?pose=sign` | 定格在 Z 写完 |
| `?pose=hero` | 定格在主画面 |
| `?pose=slab` | 定格在黑板块 |
| `?pose=sketch` | 定格在勾线完成 |

## 放进 Android 应用

把 `splash-mobile.html` 放到 `app/src/main/assets/splash/`，用一个全屏 WebView 承载，播完再进主界面：

```kotlin
class SplashActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        WindowInsetsControllerCompat(window, window.decorView).apply {
            hide(WindowInsetsCompat.Type.systemBars())
            systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        }

        val web = WebView(this).apply {
            setBackgroundColor(Color.WHITE)
            settings.javaScriptEnabled = true
            loadUrl("file:///android_asset/splash/splash-mobile.html")
        }
        setContentView(web)

        web.postDelayed({
            startActivity(Intent(this, MainActivity::class.java))
            overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out)
            finish()
        }, 8200)
    }
}
```

要点：

- 一定给 WebView 设白色背景（`setBackgroundColor(Color.WHITE)`），否则片尾淡出会露出 WebView 默认的黑。
- 延迟取 8200ms（片子约 8.2s 结束）；要更稳妥可以监听页面结束，但页面目前不发事件，用固定时长最简单。
- 主界面的入场建议用 300–400ms 的 fade_in，和片尾的白场接得上。
- iOS 同理：`WKWebView` 加载本地 html，`isOpaque = false`、`backgroundColor = .white`。

## 和桌面版的差别

- 描线画的是手机首页：顶栏一条线、左上品牌、标题线，以及**居中**的输入区与发送键（首页是空会话，输入区在画面中央，不在底部）。
- 线场间距 18px、光束截面 58（桌面是 24 / 78），在窄屏上密度相当。
- 总时长 8.2s（桌面 11s），因为手机上没人愿意等。
