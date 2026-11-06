using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace ZCodeSplash
{
    internal static class Program
    {
        [System.Runtime.InteropServices.DllImport("user32.dll")]
        private static extern bool SetForegroundWindow(IntPtr hWnd);

        [System.Runtime.InteropServices.DllImport("user32.dll")]
        private static extern bool ShowWindow(IntPtr hWnd, int command);

        [STAThread]
        private static void Main(string[] args)
        {
            if (Has(args, "--log")) Log.Enable();

            string html = Value(args, "--html");
            if (html == null) html = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "splash.html");

            string app = Value(args, "--app");
            if (app == null) app = FindApp();

            bool noLaunch = Has(args, "--no-launch");
            bool always = Has(args, "--always");
            // Default: the page has already faded to paper, so the window can
            // close straight away; --lift-ms opts into a curtain move instead.
            int liftMs = Number(args, "--lift-ms", 0);

            // A running app already owns the screen: bring it forward instead of
            // replaying the film on top of a live window.
            if (!always && !noLaunch)
            {
                IntPtr existing = ExistingWindow();
                if (existing != IntPtr.Zero)
                {
                    ShowWindow(existing, 9);
                    SetForegroundWindow(existing);
                    return;
                }
            }

            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new SplashForm(html, app, noLaunch, liftMs));
        }

        internal static IntPtr ExistingWindow()
        {
            Process[] all = Process.GetProcessesByName("ZCode");
            try
            {
                for (int i = 0; i < all.Length; i++)
                {
                    if (all[i].MainWindowHandle != IntPtr.Zero) return all[i].MainWindowHandle;
                }
            }
            finally
            {
                for (int i = 0; i < all.Length; i++) all[i].Dispose();
            }
            return IntPtr.Zero;
        }

        private static string FindApp()
        {
            string[] candidates = new string[]
            {
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "ZCode", "ZCode.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "ZCode", "ZCode.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "ZCode", "ZCode.exe"),
            };
            for (int i = 0; i < candidates.Length; i++)
            {
                if (File.Exists(candidates[i])) return candidates[i];
            }
            return candidates[0];
        }

        private static bool Has(string[] args, string name)
        {
            for (int i = 0; i < args.Length; i++)
            {
                if (string.Equals(args[i], name, StringComparison.OrdinalIgnoreCase)) return true;
            }
            return false;
        }

        private static string Value(string[] args, string name)
        {
            for (int i = 0; i < args.Length - 1; i++)
            {
                if (string.Equals(args[i], name, StringComparison.OrdinalIgnoreCase)) return args[i + 1];
            }
            return null;
        }

        private static int Number(string[] args, string name, int fallback)
        {
            string raw = Value(args, name);
            int parsed;
            if (raw != null && int.TryParse(raw, out parsed) && parsed >= 0) return parsed;
            return fallback;
        }
    }

    internal static class Log
    {
        private static bool on;
        private static string path;

        internal static void Enable()
        {
            try
            {
                string dir = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "ZCodeSplash");
                Directory.CreateDirectory(dir);
                path = Path.Combine(dir, "splash.log");
                File.WriteAllText(path, "");
                on = true;
            }
            catch (Exception) { }
        }

        internal static void Write(string message)
        {
            if (!on) return;
            try { File.AppendAllText(path, DateTime.Now.ToString("HH:mm:ss.fff") + "  " + message + "\r\n"); }
            catch (Exception) { }
        }
    }

    internal sealed class SplashForm : Form
    {
        private static readonly Color Ink = Color.FromArgb(5, 5, 6);

        private readonly string htmlPath;
        private readonly string appPath;
        private readonly bool noLaunch;
        private readonly int liftMs;

        private WebView2 webView;
        private System.Windows.Forms.Timer watchdog;
        private System.Windows.Forms.Timer dismiss;
        private bool launched;
        private bool handedOff;
        private bool cursorHidden;

        internal SplashForm(string html, string app, bool noLaunch, int liftMs)
        {
            htmlPath = html;
            appPath = app;
            this.noLaunch = noLaunch;
            this.liftMs = liftMs;

            FormBorderStyle = FormBorderStyle.None;
            StartPosition = FormStartPosition.Manual;
            // Work area, not the full screen: the app is maximized there, so the
            // captured frame lines up with the window edge to edge.
            Bounds = Screen.PrimaryScreen.WorkingArea;
            BackColor = Ink;
            TopMost = true;
            ShowInTaskbar = false;
            KeyPreview = true;
            Text = "ZCode";
        }

        protected override void OnShown(EventArgs e)
        {
            base.OnShown(e);
            Log.Write("shown");
            Cursor.Hide();
            cursorHidden = true;
            Activate();
            InitAsync();

            watchdog = new System.Windows.Forms.Timer();
            watchdog.Interval = 30000;
            watchdog.Tick += OnWatchdog;
            watchdog.Start();
        }

        private async void InitAsync()
        {
            try
            {
                string root = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "ZCodeSplash");
                string data = Path.Combine(root, "wv2");
                Directory.CreateDirectory(data);

                CoreWebView2Environment environment = await CoreWebView2Environment.CreateAsync(null, data, null);

                webView = new WebView2();
                webView.Dock = DockStyle.Fill;
                webView.BackColor = Ink;
                Controls.Add(webView);
                PaintBlack(webView);

                await webView.EnsureCoreWebView2Async(environment);

                CoreWebView2 core = webView.CoreWebView2;
                core.Settings.AreDefaultContextMenusEnabled = false;
                core.Settings.AreDevToolsEnabled = false;
                core.Settings.IsStatusBarEnabled = false;
                core.Settings.IsZoomControlEnabled = false;
                core.Settings.AreBrowserAcceleratorKeysEnabled = false;
                core.Settings.IsSwipeNavigationEnabled = false;
                PaintBlack(core);
                core.WebMessageReceived += OnMessage;
                core.Navigate(new Uri(htmlPath).AbsoluteUri);
                Log.Write("nav");

                webView.Focus();
                StartApp();
            }
            catch (Exception)
            {
                // No WebView2 runtime: the user still gets their app.
                StartApp();
                Close();
            }
        }

        /* DefaultBackgroundColor lives on different objects across SDK versions. */
        private static void PaintBlack(object target)
        {
            try
            {
                System.Reflection.PropertyInfo property = target.GetType().GetProperty("DefaultBackgroundColor");
                if (property != null && property.CanWrite) property.SetValue(target, Ink, null);
            }
            catch (Exception) { }
        }

        private void StartApp()
        {
            if (launched || noLaunch) return;
            launched = true;
            try
            {
                if (!File.Exists(appPath)) return;
                ProcessStartInfo info = new ProcessStartInfo(appPath);
                info.UseShellExecute = true;
                info.WorkingDirectory = Path.GetDirectoryName(appPath);
                Process.Start(info);
            }
            catch (Exception) { }
        }

        private void OnMessage(object sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            string text;
            try { text = e.TryGetWebMessageAsString(); }
            catch (Exception) { return; }
            if (text == "zcb:done") { Log.Write("done message"); Handoff(); }
        }

        private void OnWatchdog(object sender, EventArgs e)
        {
            if (watchdog != null) watchdog.Stop();
            Handoff();
        }

        private void Handoff()
        {
            if (handedOff) return;
            handedOff = true;
            Log.Write("handoff");
            if (watchdog != null) watchdog.Stop();
            ShowCursor();

            Thread waiter = new Thread(WaitForApp);
            waiter.IsBackground = true;
            waiter.Start();
        }

        /* The film ends on black; hold it until the app has a window to show. */
        private void WaitForApp()
        {
            if (!noLaunch)
            {
                for (int i = 0; i < 60; i++)
                {
                    if (Program.ExistingWindow() != IntPtr.Zero) break;
                    Thread.Sleep(120);
                }
                Thread.Sleep(160);
            }
            try { BeginInvoke(new Action(StartDismiss)); }
            catch (Exception) { }
        }

        /* Dissolve by motion: the page keeps the black slab and the traced shell
           on screen, and the window travels up, so the app is progressively
           uncovered instead of popping in. Window opacity is not an option —
           WebView2 is a child HWND and disappears once the window is layered. */
        private void StartDismiss()
        {
            if (dismiss != null) return;
            if (liftMs <= 0) { Log.Write("lift skipped"); Close(); return; }

            Log.Write("lift start " + liftMs + "ms");
            Rectangle start = Bounds;
            System.Diagnostics.Stopwatch clock = System.Diagnostics.Stopwatch.StartNew();

            dismiss = new System.Windows.Forms.Timer();
            dismiss.Interval = 8;
            dismiss.Tick += delegate
            {
                double t = Math.Min(1, clock.Elapsed.TotalMilliseconds / liftMs);
                double eased = 1 - Math.Pow(1 - t, 3);
                int top = start.Top - (int)Math.Round(start.Height * eased);
                SetBounds(start.Left, top, start.Width, start.Height);
                if (t >= 1)
                {
                    Log.Write("lift end top=" + top);
                    dismiss.Stop();
                    dismiss.Dispose();
                    dismiss = null;
                    Close();
                }
            };
            dismiss.Start();
        }

        private void ShowCursor()
        {
            if (!cursorHidden) return;
            cursorHidden = false;
            Cursor.Show();
        }

        protected override bool ProcessCmdKey(ref Message message, Keys keys)
        {
            if (keys == Keys.Escape) { Handoff(); return true; }
            return base.ProcessCmdKey(ref message, keys);
        }

        protected override void OnFormClosed(FormClosedEventArgs e)
        {
            ShowCursor();
            Log.Write("closed");
            if (watchdog != null) watchdog.Dispose();
            base.OnFormClosed(e);
        }
    }
}
