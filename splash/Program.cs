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
            string html = Value(args, "--html");
            if (html == null) html = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "splash.html");

            string app = Value(args, "--app");
            if (app == null) app = FindApp();

            bool noLaunch = Has(args, "--no-launch");
            bool always = Has(args, "--always");

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
            Application.Run(new SplashForm(html, app, noLaunch));
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
    }

    internal sealed class SplashForm : Form
    {
        private static readonly Color Ink = Color.FromArgb(5, 5, 6);

        private readonly string htmlPath;
        private readonly string appPath;
        private readonly bool noLaunch;

        private WebView2 webView;
        private System.Windows.Forms.Timer watchdog;
        private bool launched;
        private bool handedOff;
        private bool cursorHidden;

        internal SplashForm(string html, string app, bool noLaunch)
        {
            htmlPath = html;
            appPath = app;
            this.noLaunch = noLaunch;

            FormBorderStyle = FormBorderStyle.None;
            StartPosition = FormStartPosition.Manual;
            Bounds = Screen.PrimaryScreen.Bounds;
            BackColor = Ink;
            TopMost = true;
            ShowInTaskbar = false;
            KeyPreview = true;
            Text = "ZCode";
        }

        protected override void OnShown(EventArgs e)
        {
            base.OnShown(e);
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
            if (text == "zcb:done") Handoff();
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
            try { BeginInvoke(new Action(Close)); }
            catch (Exception) { }
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
            if (watchdog != null) watchdog.Dispose();
            base.OnFormClosed(e);
        }
    }
}
