// /**
//  * @file        PrathamOneLauncher.cs
//  * @project     PrathamOne EduOS Coaching Institute Management System
//  * @module      installer.src
//  *
//  * @author      Jawahar R. Mallah
//  * @organization AITDL (AI Technology & Development Lab)
//  * @client      Prashant Academy Coaching Institute
//  * @copyright   Copyright (c) 2026 AITDL
//  * @license     Proprietary
//  *
//  * @version     1.0.0
//  * @created     2026-11-15
//  * @updated     2026-11-15
//  *
//  * @description Native Windows GUI executable launcher with System Tray integration.
//  *              Provides 100% pure EXE execution with zero DOS or PowerShell console windows.
//  */

using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Reflection;
using System.Threading;
using System.Windows.Forms;

[assembly: AssemblyTitle("PrathamOne EduOS")]
[assembly: AssemblyDescription("Coaching Institute Management System")]
[assembly: AssemblyCompany("Smritisys & AITDL Networks")]
[assembly: AssemblyProduct("PrathamOne EduOS")]
[assembly: AssemblyCopyright("Copyright (c) 2026 Smritisys & AITDL Networks")]
[assembly: AssemblyVersion("1.0.0.0")]
[assembly: AssemblyFileVersion("1.0.0.0")]

namespace PrathamOne
{
    static class Program
    {
        private static Mutex singleInstanceMutex = null;

        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            bool createdNew;
            singleInstanceMutex = new Mutex(true, "PrathamOneEduOS_SingleInstance_Mutex_2026", out createdNew);

            if (!createdNew)
            {
                // Already running — attempt to open browser and exit
                try
                {
                    Process.Start("http://localhost:2026/");
                }
                catch { }
                return;
            }

            Application.Run(new LauncherContext());
        }
    }

    public class LauncherContext : ApplicationContext
    {
        private NotifyIcon trayIcon;
        private ContextMenu trayMenu;
        private Process backendProcess = null;
        private Process postgresProcess = null;
        private int appPort = 2026;
        private string appDir;
        private System.Windows.Forms.Timer healthTimer;
        private int healthCheckAttempts = 0;

        public LauncherContext()
        {
            appDir = AppDomain.CurrentDomain.BaseDirectory;

            // Initialize System Tray Menu
            trayMenu = new ContextMenu();
            trayMenu.MenuItems.Add(new MenuItem("Open PrathamOne EduOS", OnOpenBrowser));
            trayMenu.MenuItems.Add(new MenuItem("Copy LAN Network URL", OnCopyLanUrl));
            trayMenu.MenuItems.Add("-");
            trayMenu.MenuItems.Add(new MenuItem("Exit", OnExit));

            // Initialize System Tray Icon
            trayIcon = new NotifyIcon();
            trayIcon.Text = "PrathamOne EduOS (Starting...)";
            trayIcon.ContextMenu = trayMenu;
            trayIcon.Visible = true;

            // Load application icon from executable
            try
            {
                string iconPath = Path.Combine(appDir, @"assets\app_icon.ico");
                if (File.Exists(iconPath))
                {
                    trayIcon.Icon = new Icon(iconPath);
                }
                else
                {
                    trayIcon.Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
                }
            }
            catch
            {
                trayIcon.Icon = SystemIcons.Application;
            }

            trayIcon.DoubleClick += OnOpenBrowser;

            // Launch background services on background thread
            Thread startupThread = new Thread(StartServices);
            startupThread.IsBackground = true;
            startupThread.Start();
        }

        private void StartServices()
        {
            try
            {
                // Run python launcher supervisor using pythonw.exe (GUI mode, 0 console windows)
                string pythonwExe = Path.Combine(appDir, @"python\pythonw.exe");
                string launcherPy = Path.Combine(appDir, @"scripts\windows_launcher.py");

                if (!File.Exists(pythonwExe))
                {
                    pythonwExe = "pythonw.exe";
                }

                if (File.Exists(launcherPy))
                {
                    ProcessStartInfo psi = new ProcessStartInfo();
                    psi.FileName = pythonwExe;
                    psi.Arguments = "\"" + launcherPy + "\"";
                    psi.WorkingDirectory = appDir;
                    psi.CreateNoWindow = true;
                    psi.UseShellExecute = false;
                    psi.WindowStyle = ProcessWindowStyle.Hidden;

                    backendProcess = Process.Start(psi);
                }
                else
                {
                    MessageBox.Show(
                        "Launcher component missing:\n" + launcherPy,
                        "PrathamOne EduOS — Startup Error",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Error
                    );
                    ExitApplication();
                    return;
                }

                // Wait for healthcheck in main thread via timer
                healthTimer = new System.Windows.Forms.Timer();
                healthTimer.Interval = 1000;
                healthTimer.Tick += CheckHealth;
                healthTimer.Start();
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Error starting PrathamOne EduOS:\n" + ex.Message,
                    "PrathamOne EduOS — Startup Error",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
                ExitApplication();
            }
        }

        private void CheckHealth(object sender, EventArgs e)
        {
            healthCheckAttempts++;

            if (IsHealthy("http://127.0.0.1:2026/health"))
            {
                appPort = 2026;
                OnServiceReady();
            }
            else if (IsHealthy("http://127.0.0.1:2027/health"))
            {
                appPort = 2027;
                OnServiceReady();
            }
            else if (healthCheckAttempts > 35)
            {
                healthTimer.Stop();
                trayIcon.Text = "PrathamOne EduOS (Ready)";
                trayIcon.ShowBalloonTip(3000, "PrathamOne EduOS", "Application started. Click here to open in browser.", ToolTipIcon.Info);
                OpenBrowser();
            }
        }

        private bool IsHealthy(string url)
        {
            try
            {
                HttpWebRequest request = (HttpWebRequest)WebRequest.Create(url);
                request.Timeout = 1200;
                request.Method = "GET";
                using (HttpWebResponse response = (HttpWebResponse)request.GetResponse())
                {
                    return response.StatusCode == HttpStatusCode.OK;
                }
            }
            catch
            {
                return false;
            }
        }

        private void OnServiceReady()
        {
            healthTimer.Stop();
            trayIcon.Text = "PrathamOne EduOS (Running on port " + appPort + ")";
            trayIcon.ShowBalloonTip(3000, "PrathamOne EduOS", "Education Operating System is active and ready.", ToolTipIcon.Info);
            OpenBrowser();
        }

        private void OpenBrowser()
        {
            try
            {
                Process.Start("http://localhost:" + appPort + "/");
            }
            catch (Exception ex)
            {
                MessageBox.Show("Could not open web browser:\n" + ex.Message, "PrathamOne EduOS", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        private void OnOpenBrowser(object sender, EventArgs e)
        {
            OpenBrowser();
        }

        private void OnCopyLanUrl(object sender, EventArgs e)
        {
            string localIp = GetLocalIpAddress();
            string lanUrl = "http://" + localIp + ":" + appPort + "/";
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

        private void OnExit(object sender, EventArgs e)
        {
            ExitApplication();
        }

        private void ExitApplication()
        {
            trayIcon.Visible = false;

            // Stop backend process
            try
            {
                if (backendProcess != null && !backendProcess.HasExited)
                {
                    backendProcess.Kill();
                }
            }
            catch { }

            // Stop PostgreSQL gracefully
            try
            {
                string pgCtl = Path.Combine(appDir, @"pgsql\bin\pg_ctl.exe");
                string dataDir = Path.Combine(appDir, "data");
                if (File.Exists(pgCtl) && Directory.Exists(dataDir))
                {
                    ProcessStartInfo psi = new ProcessStartInfo();
                    psi.FileName = pgCtl;
                    psi.Arguments = "stop -D \"" + dataDir + "\" -m fast";
                    psi.CreateNoWindow = true;
                    psi.UseShellExecute = false;
                    psi.WindowStyle = ProcessWindowStyle.Hidden;
                    Process p = Process.Start(psi);
                    p.WaitForExit(3000);
                }
            }
            catch { }

            Application.Exit();
        }
    }
}
