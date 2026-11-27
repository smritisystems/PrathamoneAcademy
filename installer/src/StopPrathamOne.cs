// /**
//  * @file        StopPrathamOne.cs
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
//  * @updated     2026-11-15
//  *
//  * @description Native Windows GUI executable to cleanly stop all running PrathamOne EduOS processes.
//  */

using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Windows.Forms;

[assembly: AssemblyTitle("Stop PrathamOne EduOS")]
[assembly: AssemblyDescription("Stop PrathamOne EduOS background processes")]
[assembly: AssemblyCompany("Smritisys & AITDL Networks")]
[assembly: AssemblyProduct("PrathamOne EduOS")]
[assembly: AssemblyCopyright("Copyright (c) 2026 PrathamOne EduOS")]
[assembly: AssemblyVersion("1.189.0.0")]
[assembly: AssemblyFileVersion("1.189.0.0")]

namespace PrathamOne
{
    static class StopProgram
    {
        [STAThread]
        static void Main()
        {
            string appDir = AppDomain.CurrentDomain.BaseDirectory;
            try
            {
                // Kill PrathamOne.exe launcher instances
                foreach (Process p in Process.GetProcessesByName("PrathamOne"))
                {
                    if (p.Id != Process.GetCurrentProcess().Id)
                    {
                        try { p.Kill(); } catch { }
                    }
                }

                // Stop standalone backend and pythonw instances
                foreach (string procName in new string[] { "prathamone_backend", "pythonw" })
                {
                    foreach (Process p in Process.GetProcessesByName(procName))
                    {
                        try { p.Kill(); } catch { }
                    }
                }

                // Stop PostgreSQL cleanly (supports both Program Files -> LocalAppData and custom data root)
                string pgCtl = Path.Combine(appDir, @"pgsql\bin\pg_ctl.exe");
                string localDataDir = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "PrathamOneEduOS",
                    "data"
                );
                string appDataDir = Path.Combine(appDir, "data");
                string dataDir = File.Exists(Path.Combine(appDataDir, "PG_VERSION"))
                    ? appDataDir
                    : (Directory.Exists(localDataDir) ? localDataDir : appDataDir);
                if (File.Exists(pgCtl) && Directory.Exists(dataDir))
                {
                    ProcessStartInfo psi = new ProcessStartInfo();
                    psi.FileName = pgCtl;
                    psi.Arguments = "stop -D \"" + dataDir + "\" -m fast";
                    psi.CreateNoWindow = true;
                    psi.UseShellExecute = false;
                    psi.WindowStyle = ProcessWindowStyle.Hidden;
                    Process pgStop = Process.Start(psi);
                    if (pgStop != null) pgStop.WaitForExit(3000);
                }

                MessageBox.Show("PrathamOne EduOS services have been stopped successfully.", "PrathamOne EduOS", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show("Error stopping services:\n" + ex.Message, "PrathamOne EduOS", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }
    }
}
