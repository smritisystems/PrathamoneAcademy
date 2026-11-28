// /**
//  * @file        PrathamOneLauncher.cs
//  * @project     PrathamOne EduOS Coaching Institute Management System
//  * @module      installer.src
//  *
//  * @author      Jawahar R. Mallah
//  * @organization Smritisys & AITDL Networks
//  * @client      Prashant Academy Coaching Institute
//  * @copyright   Copyright (c) 2026 PrathamOne EduOS
//  * @license     Proprietary
//  *
//  * @version     1.0.0
//  * @created     2026-11-15
//  * @updated     2026-11-25
//  *
//  * @description Native Windows desktop application using Microsoft Edge WebView2.
//  *              Features a branded native splash screen, hardened CoreWebView2 settings,
//  *              system tray minimize helper, and graceful embedded PostgreSQL shutdown.
//  */

using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

[assembly: AssemblyTitle("PrathamOne EduOS")]
[assembly: AssemblyDescription("Coaching Institute Management System")]
[assembly: AssemblyCompany("Smritisys & AITDL Networks")]
[assembly: AssemblyProduct("PrathamOne EduOS")]
[assembly: AssemblyCopyright("Copyright (c) 2026 PrathamOne EduOS")]
[assembly: AssemblyVersion("1.190.1.0")]
[assembly: AssemblyFileVersion("1.190.1.0")]

namespace PrathamOne
{
    static class Program
    {
        private static Mutex singleInstanceMutex = null;
        private static readonly object logFileLock = new object();
        internal const long MaxLogBytes = 5L * 1024 * 1024;
        internal const int LauncherLogBackups = 5;
        internal const int FrontendLogBackups = 3;

        internal static void AppendRotatingLog(string logFilePath, string line, int maxBackups)
        {
            try
            {
                lock (logFileLock)
                {
                    string dir = Path.GetDirectoryName(logFilePath);
                    if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
                    {
                        Directory.CreateDirectory(dir);
                    }

                    if (File.Exists(logFilePath))
                    {
                        FileInfo fi = new FileInfo(logFilePath);
                        if (fi.Length >= MaxLogBytes)
                        {
                            for (int i = maxBackups; i >= 1; i--)
                            {
                                string src = (i == 1) ? logFilePath : (logFilePath + "." + (i - 1));
                                string dst = logFilePath + "." + i;
                                if (File.Exists(dst)) File.Delete(dst);
                                if (File.Exists(src)) File.Move(src, dst);
                            }
                        }
                    }

                    File.AppendAllText(logFilePath, line + Environment.NewLine, Encoding.UTF8);
                }
            }
            catch { }
        }

        internal static void CleanStrayRootLogs(string installDir, string activeDataRoot)
        {
            try
            {
                string activeLogsDir = Path.GetFullPath(Path.Combine(activeDataRoot, "logs"))
                    .TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
                string[] candidateDirs = new string[]
                {
                    installDir,
                    activeDataRoot,
                    Path.Combine(activeDataRoot, "data")
                };
                string[] logNames = new string[]
                {
                    "backend_server" + ".log",
                    "launcher" + ".log",
                    "frontend_errors" + ".log"
                };

                foreach (string dir in candidateDirs)
                {
                    if (string.IsNullOrWhiteSpace(dir) || !Directory.Exists(dir)) continue;
                    string normDir = Path.GetFullPath(dir).TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
                    if (string.Equals(normDir, activeLogsDir, StringComparison.OrdinalIgnoreCase)) continue;

                    foreach (string name in logNames)
                    {
                        string candidate = Path.Combine(normDir, name);
                        try
                        {
                            if (File.Exists(candidate) && new FileInfo(candidate).Length == 0)
                            {
                                File.Delete(candidate);
                            }
                        }
                        catch { }
                    }
                }
            }
            catch { }
        }

        [DllImport("user32.dll")]
        private static extern bool SetForegroundWindow(IntPtr hWnd);

        [DllImport("user32.dll")]
        private static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

        [DllImport("user32.dll", SetLastError = true)]
        private static extern IntPtr FindWindow(string lpClassName, string lpWindowName);

        private const int SW_RESTORE = 9;
        private const int SW_MAXIMIZE = 3;

        internal static string ResolveWritableDataRoot(string installDir)
        {
            try
            {
                string envOverride = Environment.GetEnvironmentVariable("PRATHAM_DATA_ROOT");
                if (!string.IsNullOrWhiteSpace(envOverride))
                {
                    return envOverride.Trim();
                }

                string pf = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles) ?? "";
                string pfx86 = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86) ?? "";
                bool inProgramFiles =
                    (!string.IsNullOrEmpty(pf) && installDir.StartsWith(pf, StringComparison.OrdinalIgnoreCase)) ||
                    (!string.IsNullOrEmpty(pfx86) && installDir.StartsWith(pfx86, StringComparison.OrdinalIgnoreCase));

                if (!inProgramFiles && File.Exists(Path.Combine(installDir, @"data\PG_VERSION")))
                {
                    return installDir;
                }
            }
            catch { }

            return Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "PrathamOneEduOS"
            );
        }

        [STAThread]
        static void Main(string[] args)
        {
            string appDir = AppDomain.CurrentDomain.BaseDirectory;
            string dataRoot = ResolveWritableDataRoot(appDir);
            string logDir = Path.Combine(dataRoot, "logs");
            try { Directory.CreateDirectory(logDir); } catch { }
            CleanStrayRootLogs(appDir, dataRoot);
            string logPath = Path.Combine(logDir, "launcher.log");

            Application.SetUnhandledExceptionMode(UnhandledExceptionMode.CatchException);
            Application.ThreadException += (s, e) =>
            {
                AppendRotatingLog(logPath, DateTime.Now + " [THREAD EXC]: " + e.Exception.ToString(), LauncherLogBackups);
            };
            AppDomain.CurrentDomain.UnhandledException += (s, e) =>
            {
                AppendRotatingLog(logPath, DateTime.Now + " [DOMAIN EXC]: " + (e.ExceptionObject != null ? e.ExceptionObject.ToString() : "null"), LauncherLogBackups);
            };

            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            bool createdNew;
            singleInstanceMutex = new Mutex(true, "PrathamOneEduOS_SingleInstance_Mutex_2026", out createdNew);

            if (!createdNew)
            {
                AppendRotatingLog(logPath, DateTime.Now + " [MUTEX]: Existing instance detected. Bringing to front.", LauncherLogBackups);
                try
                {
                    IntPtr hWnd = FindWindow(null, "PrathamOne EduOS");
                    if (hWnd != IntPtr.Zero)
                    {
                        ShowWindow(hWnd, SW_MAXIMIZE);
                        SetForegroundWindow(hWnd);
                    }
                }
                catch { }
                return;
            }

            try
            {
                AppendRotatingLog(logPath, DateTime.Now + " [STARTUP]: Launching MainWindow.", LauncherLogBackups);
                Application.Run(new MainWindow());
                AppendRotatingLog(logPath, DateTime.Now + " [SHUTDOWN]: MainWindow closed.", LauncherLogBackups);
            }
            catch (Exception ex)
            {
                AppendRotatingLog(logPath, DateTime.Now + " [MAIN FATAL]: " + ex.ToString(), LauncherLogBackups);
            }
        }
    }

    public class MainWindow : Form
    {
        // Core Controls
        private WebView2 webView;
        private Panel splashPanel;
        private Panel centerContainer;
        private PictureBox splashLogoBox;
        private Label lblSplashTitle;
        private Label lblSplashSubtitle;
        private ProgressBar splashProgressBar;
        private Label lblSplashStatus;
        private Label lblSplashFooter;

        // System Tray Integration
        private NotifyIcon trayIcon;
        private ContextMenu trayMenu;

        // Process & Port Management
        private CoreWebView2Environment sharedWebViewEnv = null;
        private Process backendProcess = null;
        private string appScheme = "https";
        private int appPort = 2026;
        private string appDir;
        private string dataRoot;
        private string desktopToken;
        private int healthCheckAttempts = 0;
        private int initialNavRetries = 0;
        private bool isServiceReady = false;
        private bool isWebViewInitialized = false;
        private bool hasLoadedOnce = false;
        private bool isExiting = false;

        public MainWindow()
        {
            appDir = AppDomain.CurrentDomain.BaseDirectory;
            dataRoot = Program.ResolveWritableDataRoot(appDir);
            try { Directory.CreateDirectory(Path.Combine(dataRoot, "logs")); } catch { }
            desktopToken = GenerateDesktopToken();
            LogInfo("[MAINWINDOW] Constructor started.");

            ServicePointManager.ServerCertificateValidationCallback = (sender, cert, chain, sslPolicyErrors) => true;
            try
            {
                ServicePointManager.SecurityProtocol = (SecurityProtocolType)12288 | (SecurityProtocolType)3072 | SecurityProtocolType.Tls;
            }
            catch { }

            InitializeForm();
            InitializeSplashUI();
            InitializeWebViewControl();
            InitializeTrayIcon();

            this.Load += MainWindow_Load;
            this.Resize += MainWindow_Resize;
            this.FormClosing += MainWindow_FormClosing;
            LogInfo("[MAINWINDOW] Form initialized and ready.");
        }

        private void LogInfo(string msg)
        {
            string logFile = Path.Combine(dataRoot, "logs", "launcher.log");
            Program.AppendRotatingLog(logFile, DateTime.Now.ToString("HH:mm:ss.fff") + " " + msg, Program.LauncherLogBackups);
        }

        private void LogFrontendError(string sanitizedJson)
        {
            string logFile = Path.Combine(dataRoot, "logs", "frontend_errors.log");
            string cleanLine = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff") + " [FRONTEND] " + sanitizedJson;
            Program.AppendRotatingLog(logFile, cleanLine, Program.FrontendLogBackups);
        }

        private static string ScrubFrontendErrorJson(string rawJson)
        {
            if (string.IsNullOrWhiteSpace(rawJson)) return "";
            string singleLine = rawJson.Replace("\r", " ").Replace("\n", " ").Trim();
            singleLine = Regex.Replace(singleLine, @"\bBearer\s+[A-Za-z0-9\-._~+/]+=*", "Bearer [REDACTED]", RegexOptions.IgnoreCase);
            singleLine = Regex.Replace(singleLine, @"\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}(?:\.[A-Za-z0-9_-]+)?", "[REDACTED_JWT]");
            singleLine = Regex.Replace(singleLine, @"\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b", "[REDACTED_UID]");
            if (singleLine.Length > 4096)
            {
                singleLine = singleLine.Substring(0, 4096) + "...[TRUNCATED]";
            }
            return singleLine;
        }

        private void OnCoreWebViewMessageReceived(object sender, CoreWebView2WebMessageReceivedEventArgs args)
        {
            try
            {
                if (!IsLocalLoopbackUri(args.Source)) return;
                string rawJson = args.WebMessageAsJson;
                if (string.IsNullOrWhiteSpace(rawJson) || !rawJson.Contains("PRATHAMONE_FRONTEND_ERROR"))
                {
                    return;
                }
                string scrubbed = ScrubFrontendErrorJson(rawJson);
                if (!string.IsNullOrEmpty(scrubbed))
                {
                    LogFrontendError(scrubbed);
                }
            }
            catch { }
        }

        private static string GenerateDesktopToken()
        {
            byte[] bytes = new byte[32];
            using (RNGCryptoServiceProvider rng = new RNGCryptoServiceProvider())
            {
                rng.GetBytes(bytes);
            }
            StringBuilder sb = new StringBuilder(64);
            for (int i = 0; i < bytes.Length; i++)
            {
                sb.Append(bytes[i].ToString("x2"));
            }
            return sb.ToString();
        }

        private void InitializeForm()
        {
            this.Text = "PrathamOne EduOS";
            this.WindowState = FormWindowState.Maximized;
            this.StartPosition = FormStartPosition.CenterScreen;
            this.MinimumSize = new Size(1024, 680);
            this.BackColor = Color.FromArgb(15, 23, 42); // Sleek Slate-900

            // Load application icon
            try
            {
                string iconPath = Path.Combine(appDir, @"assets\app_icon.ico");
                if (File.Exists(iconPath))
                {
                    this.Icon = new Icon(iconPath);
                }
                else
                {
                    this.Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
                }
            }
            catch
            {
                this.Icon = SystemIcons.Application;
            }
        }

        private void InitializeSplashUI()
        {
            splashPanel = new Panel();
            splashPanel.Dock = DockStyle.Fill;
            splashPanel.BackColor = Color.FromArgb(0, 27, 68); // Brand Navy (#001B44)

            centerContainer = new Panel();
            centerContainer.Size = new Size(540, 440);
            centerContainer.BackColor = Color.Transparent;

            // Animated Splash / Logo Box (matches 640x360 Splash.gif 16:9 aspect ratio)
            splashLogoBox = new PictureBox();
            splashLogoBox.Size = new Size(480, 270);
            splashLogoBox.Location = new Point((centerContainer.Width - splashLogoBox.Width) / 2, 10);
            splashLogoBox.SizeMode = PictureBoxSizeMode.Zoom;
            splashLogoBox.BackColor = Color.FromArgb(254, 254, 255);

            try
            {
                string[] logoCandidates = new string[]
                {
                    Path.Combine(appDir, @"assets\Splash.gif"),
                    Path.Combine(appDir, @"assets\widelogo.png"),
                    Path.Combine(appDir, @"assets\prathamone_emblem.png"),
                    Path.Combine(appDir, @"assets\app_icon.ico")
                };

                foreach (string candidate in logoCandidates)
                {
                    if (File.Exists(candidate))
                    {
                        if (candidate.EndsWith(".ico", StringComparison.OrdinalIgnoreCase))
                        {
                            splashLogoBox.Size = new Size(100, 100);
                            splashLogoBox.Location = new Point((centerContainer.Width - splashLogoBox.Width) / 2, 20);
                            splashLogoBox.BackColor = Color.Transparent;
                            using (Icon ico = new Icon(candidate, new Size(96, 96)))
                            {
                                splashLogoBox.Image = ico.ToBitmap();
                            }
                        }
                        else if (candidate.EndsWith(".gif", StringComparison.OrdinalIgnoreCase))
                        {
                            splashLogoBox.Image = Image.FromFile(candidate);
                        }
                        else
                        {
                            splashLogoBox.BackColor = Color.Transparent;
                            splashLogoBox.Image = Image.FromFile(candidate);
                        }
                        break;
                    }
                }
            }
            catch { }

            // App Title Label
            lblSplashTitle = new Label();
            lblSplashTitle.Text = "PrathamONE EduOS";
            lblSplashTitle.Font = new Font("Segoe UI", 18F, FontStyle.Bold);
            lblSplashTitle.ForeColor = Color.White;
            lblSplashTitle.TextAlign = ContentAlignment.MiddleCenter;
            lblSplashTitle.Size = new Size(540, 34);
            lblSplashTitle.Location = new Point(0, 290);

            // Subtitle Label
            lblSplashSubtitle = new Label();
            lblSplashSubtitle.Text = "Simply Powerful  •  Coaching Institute Edition";
            lblSplashSubtitle.Font = new Font("Segoe UI", 10F, FontStyle.Regular);
            lblSplashSubtitle.ForeColor = Color.FromArgb(203, 213, 225); // Slate-300
            lblSplashSubtitle.TextAlign = ContentAlignment.MiddleCenter;
            lblSplashSubtitle.Size = new Size(540, 24);
            lblSplashSubtitle.Location = new Point(0, 326);

            // Marquee Progress Bar
            splashProgressBar = new ProgressBar();
            splashProgressBar.Style = ProgressBarStyle.Marquee;
            splashProgressBar.MarqueeAnimationSpeed = 25;
            splashProgressBar.Size = new Size(360, 6);
            splashProgressBar.Location = new Point((centerContainer.Width - splashProgressBar.Width) / 2, 362);

            // Status Label
            lblSplashStatus = new Label();
            lblSplashStatus.Text = "Starting embedded database and local services...";
            lblSplashStatus.Font = new Font("Segoe UI", 9F, FontStyle.Regular);
            lblSplashStatus.ForeColor = Color.FromArgb(148, 163, 184); // Slate-400
            lblSplashStatus.TextAlign = ContentAlignment.MiddleCenter;
            lblSplashStatus.Size = new Size(540, 22);
            lblSplashStatus.Location = new Point(0, 376);

            // Footer Label
            lblSplashFooter = new Label();
            lblSplashFooter.Text = "Smritisys & AITDL Networks  •  Version 1.190.1";
            lblSplashFooter.Font = new Font("Segoe UI", 8.5F, FontStyle.Regular);
            lblSplashFooter.ForeColor = Color.FromArgb(148, 163, 184);
            lblSplashFooter.TextAlign = ContentAlignment.MiddleCenter;
            lblSplashFooter.Size = new Size(540, 20);
            lblSplashFooter.Location = new Point(0, 410);

            centerContainer.Controls.Add(splashLogoBox);
            centerContainer.Controls.Add(lblSplashTitle);
            centerContainer.Controls.Add(lblSplashSubtitle);
            centerContainer.Controls.Add(splashProgressBar);
            centerContainer.Controls.Add(lblSplashStatus);
            centerContainer.Controls.Add(lblSplashFooter);

            splashPanel.Controls.Add(centerContainer);
            this.Controls.Add(splashPanel);
            PositionCenterContainer();
        }

        private void PositionCenterContainer()
        {
            if (centerContainer != null && splashPanel != null)
            {
                centerContainer.Location = new Point(
                    Math.Max(0, (splashPanel.ClientSize.Width - centerContainer.Width) / 2),
                    Math.Max(0, (splashPanel.ClientSize.Height - centerContainer.Height) / 2)
                );
            }
        }

        private void InitializeWebViewControl()
        {
            webView = new WebView2();
            webView.Dock = DockStyle.Fill;
            webView.Visible = false;
            this.Controls.Add(webView);
        }

        private void InitializeTrayIcon()
        {
            trayMenu = new ContextMenu();
            trayMenu.MenuItems.Add(new MenuItem("Open PrathamOne EduOS", OnTrayOpen));
            trayMenu.MenuItems.Add(new MenuItem("Copy LAN Network URL", OnTrayCopyLanUrl));
            trayMenu.MenuItems.Add("-");
            trayMenu.MenuItems.Add(new MenuItem("Exit", OnTrayExit));

            trayIcon = new NotifyIcon();
            trayIcon.Text = "PrathamOne EduOS (Starting...)";
            trayIcon.ContextMenu = trayMenu;
            trayIcon.Icon = this.Icon;
            trayIcon.Visible = true;
            trayIcon.DoubleClick += (s, e) => RestoreAndActivateWindow();
        }

        private async void MainWindow_Load(object sender, EventArgs e)
        {
            LogInfo("[LOAD] MainWindow_Load started.");
            // 1. Initialize WebView2 in parallel
            await InitializeWebViewAsync();

            // 2. Start background backend supervisor
            Thread startupThread = new Thread(StartServices);
            startupThread.IsBackground = true;
            startupThread.Start();
            LogInfo("[LOAD] Startup thread launched.");
        }

        private void MainWindow_Resize(object sender, EventArgs e)
        {
            PositionCenterContainer();
        }

        private async Task InitializeWebViewAsync()
        {
            LogInfo("[WEBVIEW] InitializeWebViewAsync starting.");
            try
            {
                // Isolate user data folder into LocalApplicationData
                string userDataFolder = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "PrathamOneEduOS",
                    "WebView2Profile"
                );

                // Retry briefly if an exiting msedgewebview2 process is still releasing WebView2Profile (0x800700AA)
                for (int wvAttempt = 1; wvAttempt <= 4; wvAttempt++)
                {
                    bool retryProfileBusy = false;
                    try
                    {
                        CoreWebView2Environment env = await CoreWebView2Environment.CreateAsync(null, userDataFolder);
                        sharedWebViewEnv = env;
                        LogInfo("[WEBVIEW] Environment created. Ensuring CoreWebView2Async (attempt " + wvAttempt + ")...");
                        await webView.EnsureCoreWebView2Async(env);
                        break;
                    }
                    catch (COMException comEx)
                    {
                        if ((uint)comEx.ErrorCode == 0x800700AA && wvAttempt < 4)
                        {
                            retryProfileBusy = true;
                        }
                        else
                        {
                            throw;
                        }
                    }
                    if (retryProfileBusy)
                    {
                        LogInfo("[WEBVIEW RETRY] Profile busy (0x800700AA), waiting 800ms...");
                        await Task.Delay(800);
                    }
                }
                LogInfo("[WEBVIEW] CoreWebView2 initialized successfully.");

                ConfigureCoreWebView2(webView.CoreWebView2);

                // Handle external links and document popups cleanly
                webView.CoreWebView2.NewWindowRequested += OnNewWindowRequested;

                // Handle navigation events
                webView.NavigationCompleted += OnNavigationCompleted;

                isWebViewInitialized = true;
                LogInfo("[WEBVIEW] Ready. isServiceReady=" + isServiceReady);

                // If backend already signaled ready before WebView2 completed initialization, navigate immediately
                if (isServiceReady)
                {
                    NavigateToApplication();
                }
            }
            catch (Exception ex)
            {
                LogInfo("[WEBVIEW EXCEPTION] " + ex.ToString());
                lblSplashStatus.Text = "Preparing WebView2 desktop engine...";
                // If WebView2 runtime is missing or corrupt, prompt user with helpful recovery
                if (ex is DllNotFoundException || ex.Message.IndexOf("WebView2", StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    PromptWebView2Installation();
                }
            }
        }

        private void PromptWebView2Installation()
        {
            DialogResult res = MessageBox.Show(
                "Microsoft Edge WebView2 Runtime is required to run PrathamOne EduOS Desktop.\n\n" +
                "Would you like to install the official Microsoft Edge WebView2 Runtime now?",
                "PrathamOne EduOS — WebView2 Runtime Required",
                MessageBoxButtons.YesNo,
                MessageBoxIcon.Question
            );

            if (res == DialogResult.Yes)
            {
                try
                {
                    Process.Start(new ProcessStartInfo("https://go.microsoft.com/fwlink/p/?LinkId=2124703") { UseShellExecute = true });
                }
                catch { }
            }
        }

        private void ConfigureCoreWebView2(CoreWebView2 core)
        {
            // Harden CoreWebView2 Settings for Production
            CoreWebView2Settings settings = core.Settings;
            settings.AreDevToolsEnabled = false;
            settings.AreDefaultContextMenusEnabled = false;
            settings.IsBuiltInErrorPageEnabled = false;
            settings.IsStatusBarEnabled = false;
            settings.IsZoomControlEnabled = true;
            settings.IsWebMessageEnabled = true;

            core.WebMessageReceived += OnCoreWebViewMessageReceived;
            core.ProcessFailed += (s, args) =>
            {
                LogInfo("[WEBVIEW PROCESS FAILED] Kind=" + args.ProcessFailedKind + " Reason=" + args.Reason);
            };

            // Accept local PKI certificates on loopback and local domains
            core.ServerCertificateErrorDetected += (s, args) =>
            {
                string uri = args.RequestUri ?? "";
                if (IsLocalLoopbackUri(uri))
                {
                    args.Action = CoreWebView2ServerCertificateErrorAction.AlwaysAllow;
                }
            };

            // Inject cryptographic IPC token header for loopback/local requests
            core.AddWebResourceRequestedFilter("*://127.0.0.1*", CoreWebView2WebResourceContext.All);
            core.AddWebResourceRequestedFilter("*://localhost*", CoreWebView2WebResourceContext.All);
            core.AddWebResourceRequestedFilter("*://prathamone*", CoreWebView2WebResourceContext.All);
            core.AddWebResourceRequestedFilter("*://classesname*", CoreWebView2WebResourceContext.All);
            core.WebResourceRequested += (s, args) =>
            {
                if (!string.IsNullOrEmpty(desktopToken))
                {
                    args.Request.Headers.SetHeader("X-Pratham-Client-Token", desktopToken);
                }
            };

            SeedDesktopTokenCookies(core);
        }

        private void SeedDesktopTokenCookies(CoreWebView2 core)
        {
            if (string.IsNullOrEmpty(desktopToken) || core == null) return;
            try
            {
                string[] hosts = new string[] { "127.0.0.1", "localhost", "prathamone", "classesname" };
                foreach (string h in hosts)
                {
                    CoreWebView2Cookie cookie = core.CookieManager.CreateCookie("pratham_client_token", desktopToken, h, "/");
                    cookie.IsHttpOnly = true;
                    cookie.IsSecure = (appScheme == "https");
                    cookie.SameSite = CoreWebView2CookieSameSiteKind.Lax;
                    core.CookieManager.AddOrUpdateCookie(cookie);
                }
            }
            catch { }
        }

        private static bool IsLocalLoopbackUri(string uri)
        {
            if (string.IsNullOrEmpty(uri)) return false;
            if (uri.StartsWith("about:", StringComparison.OrdinalIgnoreCase) ||
                uri.StartsWith("blob:", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
            try
            {
                Uri parsed = new Uri(uri);
                string host = (parsed.Host ?? "").ToLowerInvariant();
                return host == "127.0.0.1" || host == "::1" || host == "localhost" ||
                       host == "prathamone" || host == "prathamone.local" ||
                       host == "classesname" || host == "classesname.local";
            }
            catch
            {
                return uri.IndexOf("127.0.0.1", StringComparison.OrdinalIgnoreCase) >= 0 ||
                       uri.IndexOf("localhost", StringComparison.OrdinalIgnoreCase) >= 0;
            }
        }

        private async void OnNewWindowRequested(object sender, CoreWebView2NewWindowRequestedEventArgs e)
        {
            // Keep internal PDFs/receipts/exports inside an authenticated WebView2 popup instead of external browser (prevents 403 loopback error)
            if (IsLocalLoopbackUri(e.Uri) && sharedWebViewEnv != null)
            {
                CoreWebView2Deferral deferral = e.GetDeferral();
                try
                {
                    Form popupForm = new Form();
                    popupForm.Text = "PrathamOne EduOS — Document Viewer";
                    popupForm.Icon = this.Icon;
                    popupForm.WindowState = FormWindowState.Maximized;
                    popupForm.StartPosition = FormStartPosition.CenterScreen;
                    popupForm.BackColor = Color.FromArgb(15, 23, 42);

                    WebView2 popupWebView = new WebView2();
                    popupWebView.Dock = DockStyle.Fill;
                    popupForm.Controls.Add(popupWebView);
                    popupForm.Show(this);

                    await popupWebView.EnsureCoreWebView2Async(sharedWebViewEnv);
                    ConfigureCoreWebView2(popupWebView.CoreWebView2);
                    popupWebView.CoreWebView2.NewWindowRequested += OnNewWindowRequested;
                    popupWebView.CoreWebView2.WindowCloseRequested += (ws, we) =>
                    {
                        try { popupForm.Close(); } catch { }
                    };

                    e.NewWindow = popupWebView.CoreWebView2;
                    e.Handled = true;
                }
                catch (Exception ex)
                {
                    LogInfo("[POPUP EXCEPTION] " + ex.Message);
                }
                finally
                {
                    deferral.Complete();
                }
                return;
            }

            // Truly external URLs open in default system browser
            e.Handled = true;
            if (!string.IsNullOrEmpty(e.Uri))
            {
                try
                {
                    ProcessStartInfo psi = new ProcessStartInfo(e.Uri);
                    psi.UseShellExecute = true;
                    Process.Start(psi);
                }
                catch { }
            }
        }

        private void OnNavigationCompleted(object sender, CoreWebView2NavigationCompletedEventArgs e)
        {
            LogInfo("[NAV COMPLETE] Success=" + e.IsSuccess + " ErrorStatus=" + e.WebErrorStatus);
            if (e.IsSuccess)
            {
                hasLoadedOnce = true;
                initialNavRetries = 0;
                // Once React SPA loads, hide the splash screen and reveal the native WebView2
                splashPanel.Visible = false;
                webView.Visible = true;
                webView.BringToFront();
                this.Text = "PrathamOne EduOS";
                LogInfo("[NAV COMPLETE] Splash panel hidden, WebView2 active.");
            }
            else if (!hasLoadedOnce && initialNavRetries < 2 &&
                     e.WebErrorStatus != CoreWebView2WebErrorStatus.ConnectionAborted &&
                     e.WebErrorStatus != CoreWebView2WebErrorStatus.OperationCanceled)
            {
                initialNavRetries++;
                lblSplashStatus.Text = "Navigation notice (" + e.WebErrorStatus + "). Loading workspace...";
                appScheme = (appScheme == "http") ? "https" : "http";
                LogInfo("[NAV RETRY " + initialNavRetries + "] Switching scheme to " + appScheme + " and retrying navigation...");
                Task.Delay(1000).ContinueWith(_ =>
                {
                    try { this.Invoke(new Action(NavigateToApplication)); } catch { }
                });
            }
        }

        private void StartServices()
        {
            LogInfo("[SERVICES] StartServices thread running.");
            try
            {
                // Terminate any orphaned backend supervisor from an earlier ungraceful exit so token stays in sync
                try
                {
                    foreach (Process orphan in Process.GetProcessesByName("prathamone_backend"))
                    {
                        try { orphan.Kill(); orphan.WaitForExit(2000); } catch { }
                    }
                }
                catch { }
                // Prefer compiled standalone Nuitka backend executable (zero Python installation required)
                string standaloneBackendExe = Path.Combine(appDir, @"backend\prathamone_backend.exe");
                string pythonwExe = Path.Combine(appDir, @"python\pythonw.exe");
                string launcherPy = Path.Combine(appDir, @"scripts\windows_launcher.py");

                if (File.Exists(standaloneBackendExe))
                {
                    LogInfo("[SERVICES] Spawning standalone native backend: " + standaloneBackendExe);
                    ProcessStartInfo psi = new ProcessStartInfo();
                    psi.FileName = standaloneBackendExe;
                    psi.Arguments = "--no-browser --host 127.0.0.1";
                    psi.WorkingDirectory = Path.Combine(appDir, "backend");
                    psi.CreateNoWindow = true;
                    psi.UseShellExecute = false;
                    psi.WindowStyle = ProcessWindowStyle.Hidden;
                    psi.EnvironmentVariables["PRATHAM_DATA_ROOT"] = dataRoot;
                    psi.EnvironmentVariables["PRATHAM_ENV_FILE"] = Path.Combine(dataRoot, ".env");
                    if (!string.IsNullOrEmpty(desktopToken))
                    {
                        psi.EnvironmentVariables["PRATHAM_DESKTOP_TOKEN"] = desktopToken;
                    }

                    backendProcess = Process.Start(psi);
                    LogInfo("[SERVICES] Standalone backend spawned. PID=" + (backendProcess != null ? backendProcess.Id.ToString() : "null"));
                }
                else
                {
                    if (!File.Exists(pythonwExe))
                    {
                        pythonwExe = "pythonw.exe";
                    }

                    if (File.Exists(launcherPy))
                    {
                        LogInfo("[SERVICES] Spawning python launcher: " + pythonwExe + " " + launcherPy);
                        ProcessStartInfo psi = new ProcessStartInfo();
                        psi.FileName = pythonwExe;
                        psi.Arguments = "\"" + launcherPy + "\" --no-browser";
                        psi.WorkingDirectory = appDir;
                        psi.CreateNoWindow = true;
                        psi.UseShellExecute = false;
                        psi.WindowStyle = ProcessWindowStyle.Hidden;
                        if (!string.IsNullOrEmpty(desktopToken))
                        {
                            psi.EnvironmentVariables["PRATHAM_DESKTOP_TOKEN"] = desktopToken;
                        }

                        backendProcess = Process.Start(psi);
                        LogInfo("[SERVICES] Backend supervisor spawned. PID=" + (backendProcess != null ? backendProcess.Id.ToString() : "null"));
                    }
                    else
                    {
                        LogInfo("[SERVICES WARN] Neither standalone backend nor launcherPy found.");
                    }
                }

                // Poll healthcheck directly on this background thread (zero UI thread freezing)
                bool hasSslCert = File.Exists(Path.Combine(appDir, @"assets\prathamone_ssl_cert.pem")) ||
                                  File.Exists(Path.Combine(appDir, @"installer\assets\prathamone_ssl_cert.pem"));
                string primaryScheme = hasSslCert ? "https" : "http";
                string fallbackScheme = hasSslCert ? "http" : "https";
                LogInfo("[SERVICES] Polling backend healthcheck (preferred scheme=" + primaryScheme + ")...");

                Stopwatch sw = Stopwatch.StartNew();
                int attempts = 0;
                while (!isExiting && sw.Elapsed.TotalSeconds < 120)
                {
                    attempts++;
                    Thread.Sleep(500);

                    for (int p = 2026; p <= 2051; p++)
                    {
                        if (!IsTcpPortOpen("127.0.0.1", p, 120)) continue;

                        if (IsHealthy(primaryScheme + "://127.0.0.1:" + p + "/health"))
                        {
                            appScheme = primaryScheme;
                            appPort = p;
                            LogInfo("[SERVICES] Healthcheck PASSED: " + appScheme + "://127.0.0.1:" + appPort + "/health");
                            this.Invoke(new Action(OnServiceReady));
                            return;
                        }
                        if (IsHealthy(fallbackScheme + "://127.0.0.1:" + p + "/health"))
                        {
                            appScheme = fallbackScheme;
                            appPort = p;
                            LogInfo("[SERVICES] Healthcheck PASSED: " + appScheme + "://127.0.0.1:" + appPort + "/health");
                            this.Invoke(new Action(OnServiceReady));
                            return;
                        }
                    }

                    if (attempts % 4 == 0)
                    {
                        int sec = (int)sw.Elapsed.TotalSeconds;
                        this.Invoke(new Action(() =>
                        {
                            lblSplashStatus.Text = "Verifying database and local services... (" + sec + "s)";
                        }));
                    }
                }

                LogInfo("[SERVICES WARN] Max healthcheck timeout reached. Attempting navigation to default port.");
                appScheme = primaryScheme;
                appPort = 2026;
                this.Invoke(new Action(OnServiceReady));
            }
            catch (Exception ex)
            {
                LogInfo("[SERVICES EXCEPTION] " + ex.ToString());
                this.Invoke(new Action(() =>
                {
                    lblSplashStatus.Text = "Startup exception: " + ex.Message;
                }));
            }
        }

        private bool IsTcpPortOpen(string host, int port, int timeoutMs)
        {
            try
            {
                using (TcpClient client = new TcpClient())
                {
                    IAsyncResult res = client.BeginConnect(host, port, null, null);
                    bool success = res.AsyncWaitHandle.WaitOne(timeoutMs);
                    if (!success) return false;
                    client.EndConnect(res);
                    return true;
                }
            }
            catch
            {
                return false;
            }
        }

        private bool IsHealthy(string url)
        {
            healthCheckAttempts++;
            try
            {
                HttpWebRequest request = (HttpWebRequest)WebRequest.Create(url);
                request.Timeout = 1500;
                request.Method = "GET";
                request.UserAgent = "PrathamOneNativeDesktop/1.0";
                if (!string.IsNullOrEmpty(desktopToken))
                {
                    request.Headers.Add("X-Pratham-Client-Token", desktopToken);
                }
                using (HttpWebResponse response = (HttpWebResponse)request.GetResponse())
                {
                    return response.StatusCode == HttpStatusCode.OK;
                }
            }
            catch (Exception ex)
            {
                if (healthCheckAttempts % 3 == 0)
                {
                    LogInfo("[IS_HEALTHY FAIL] " + url + " -> " + ex.Message);
                }
                return false;
            }
        }

        private void OnServiceReady()
        {
            if (isServiceReady) return;

            isServiceReady = true;
            trayIcon.Text = "PrathamOne EduOS (Port " + appPort + ")";
            lblSplashStatus.Text = "Services online. Loading workspace...";
            LogInfo("[READY] Service is ready on " + appScheme + "://127.0.0.1:" + appPort + " (isWebViewInitialized=" + isWebViewInitialized + ")");

            if (isWebViewInitialized)
            {
                NavigateToApplication();
            }
        }

        private void NavigateToApplication()
        {
            if (this.InvokeRequired)
            {
                this.Invoke(new Action(NavigateToApplication));
                return;
            }

            try
            {
                string targetUrl = appScheme + "://127.0.0.1:" + appPort + "/";
                SeedDesktopTokenCookies(webView.CoreWebView2);
                LogInfo("[NAVIGATE] Navigating WebView2 to: " + targetUrl);
                webView.CoreWebView2.Navigate(targetUrl);
            }
            catch (Exception ex)
            {
                LogInfo("[NAVIGATE EXCEPTION] " + ex.ToString());
                lblSplashStatus.Text = "Navigation notice: " + ex.Message;
            }
        }

        private void RestoreAndActivateWindow()
        {
            if (this.WindowState == FormWindowState.Minimized)
            {
                this.WindowState = FormWindowState.Maximized;
            }
            this.Show();
            this.BringToFront();
            this.Activate();
        }

        private void OnTrayOpen(object sender, EventArgs e)
        {
            RestoreAndActivateWindow();
        }

        private void OnTrayCopyLanUrl(object sender, EventArgs e)
        {
            string localIp = GetLocalIpAddress();
            string lanUrl = appScheme + "://" + localIp + ":" + appPort + "/";
            Clipboard.SetText(lanUrl);
            trayIcon.ShowBalloonTip(2000, "PrathamOne EduOS", "LAN URL copied to clipboard:\n" + lanUrl, ToolTipIcon.Info);
        }

        private string GetLocalIpAddress()
        {
            try
            {
                using (Socket socket = new Socket(AddressFamily.InterNetwork, SocketType.Dgram, 0))
                {
                    socket.Connect("8.8.8.8", 65530);
                    IPEndPoint endPoint = socket.LocalEndPoint as IPEndPoint;
                    return endPoint.Address.ToString();
                }
            }
            catch
            {
                return "127.0.0.1";
            }
        }

        private void OnTrayExit(object sender, EventArgs e)
        {
            this.Close();
        }

        private void MainWindow_FormClosing(object sender, FormClosingEventArgs e)
        {
            LogInfo("[CLOSING] MainWindow_FormClosing. CloseReason=" + e.CloseReason + " isExiting=" + isExiting);
            if (isExiting) return;
            isExiting = true;

            // Hide window, dispose WebView2, and hide tray icon immediately for responsive UX
            this.Hide();
            try
            {
                if (webView != null) webView.Dispose();
            }
            catch { }
            if (trayIcon != null)
            {
                trayIcon.Visible = false;
                trayIcon.Dispose();
            }

            // Perform complete graceful shutdown of backend and PostgreSQL
            ShutdownServices();
        }

        private void ShutdownServices()
        {
            // 1. Request graceful Uvicorn + SQLAlchemy + PostgreSQL shutdown first
            try
            {
                if (backendProcess != null && !backendProcess.HasExited)
                {
                    if (appPort > 0 && !string.IsNullOrEmpty(desktopToken))
                    {
                        try
                        {
                            string shutdownUrl = (string.IsNullOrEmpty(appScheme) ? "https" : appScheme) + "://127.0.0.1:" + appPort + "/_desktop/shutdown";
                            HttpWebRequest req = (HttpWebRequest)WebRequest.Create(shutdownUrl);
                            req.Method = "POST";
                            req.Timeout = 1500;
                            req.ReadWriteTimeout = 1500;
                            req.ContentLength = 0;
                            req.Headers.Add("X-Pratham-Client-Token", desktopToken);
                            using (HttpWebResponse resp = (HttpWebResponse)req.GetResponse()) { }
                        }
                        catch { }
                        backendProcess.WaitForExit(3500);
                    }
                    if (!backendProcess.HasExited)
                    {
                        backendProcess.Kill();
                    }
                }
            }
            catch { }

            // 2. Terminate running backend / pythonw instances
            try
            {
                foreach (string procName in new string[] { "prathamone_backend", "pythonw" })
                {
                    foreach (Process p in Process.GetProcessesByName(procName))
                    {
                        try { p.Kill(); } catch { }
                    }
                }
            }
            catch { }

            // 3. Gracefully stop PostgreSQL cluster
            try
            {
                string pgCtl = Path.Combine(appDir, @"pgsql\bin\pg_ctl.exe");
                string appDataDir = Path.Combine(appDir, "data");
                string userDataDir = Path.Combine(dataRoot, "data");
                string dataDir = File.Exists(Path.Combine(userDataDir, "PG_VERSION"))
                    ? userDataDir
                    : appDataDir;
                if (File.Exists(pgCtl) && Directory.Exists(dataDir))
                {
                    ProcessStartInfo psi = new ProcessStartInfo();
                    psi.FileName = pgCtl;
                    psi.Arguments = "stop -D \"" + dataDir + "\" -m fast";
                    psi.CreateNoWindow = true;
                    psi.UseShellExecute = false;
                    psi.WindowStyle = ProcessWindowStyle.Hidden;
                    Process p = Process.Start(psi);
                    if (p != null) p.WaitForExit(8000);
                }
            }
            catch { }
        }
    }
}
