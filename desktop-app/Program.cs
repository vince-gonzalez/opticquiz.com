// OpticQuiz Colorblind Corrector — Windows desktop app.
// A system-tray toggle that applies a real-time color CORRECTION to the ENTIRE screen
// (every app, game, image, the desktop) for a chosen type of color-vision deficiency.
// It uses the Windows Magnification API's full-screen color effect, fed the OpticQuiz
// daltonization matrices (Machado 2009 sim + Fidaner redistribution), transposed for the
// Windows color-matrix convention. Method: https://doi.org/10.5281/zenodo.21310578  MIT.
using System;
using System.Drawing;
using System.IO;
using System.Runtime.InteropServices;
using System.Windows.Forms;

namespace OpticQuizCorrector
{
    internal static class Native
    {
        [DllImport("Magnification.dll")] public static extern bool MagInitialize();
        [DllImport("Magnification.dll")] public static extern bool MagUninitialize();
        [DllImport("Magnification.dll")] public static extern bool MagSetFullscreenColorEffect(ref MAGCOLOREFFECT effect);

        [StructLayout(LayoutKind.Sequential)]
        public struct MAGCOLOREFFECT
        {
            [MarshalAs(UnmanagedType.ByValArray, SizeConst = 25)]
            public float[] transform; // 5x5, row-major
        }
    }

    // 5x5 color matrices in the Windows/GDI convention (newColor = color * matrix),
    // i.e. the transpose of the browser feColorMatrix values.
    //
    // IMPORTANT: these are NOT the browser matrices. MagSetFullscreenColorEffect applies
    // its matrix to GAMMA-ENCODED sRGB, while every browser surface applies in linear
    // light. A matrix is not transferable between the two - the sRGB transfer curve sits
    // between them and no 3x3 undoes a nonlinearity. Running the browser matrices here
    // measured NET HARMFUL for tritanopia (-4 on real palettes) and near-useless for
    // deuteranopia (+3). Deuteranopia and Tritanopia below are derived specifically for
    // sRGB space by research/windows-benchmark/optimise_srgb.py: +18 and +4 held out.
    //
    // Protanopia stays on the original: its sRGB-derived candidate tied on net (+16 vs
    // +17) and was refused rather than shipped on a tie.
    internal static class Matrices
    {
        public static readonly float[] Off = {
            1,0,0,0,0,  0,1,0,0,0,  0,0,1,0,0,  0,0,0,1,0,  0,0,0,0,1 };
        public static readonly float[] Recommended = {
            0.9777f,0.3248f,0.4547f,0,0,  -0.7251f,0.2051f,-0.6454f,0,0,  0.7474f,0.4701f,1.1907f,0,0,  0,0,0,1,0,  0,0,0,0,1 };
        public static readonly float[] Deuteranopia = {
            1.02157f, -0.29392f, -0.56670f,0,0,  -0.28097f, 1.67034f, 0.55809f,0,0,  0.25940f, -0.37642f, 1.00861f,0,0,  0,0,0,1,0,  0,0,0,0,1 };
        public static readonly float[] Protanopia = {
            1,0.4789f,0.5973f,0,0,  0,0.4769f,-0.6887f,0,0,  0,0.0442f,1.0914f,0,0,  0,0,0,1,0,  0,0,0,0,1 };
        public static readonly float[] Tritanopia = {
            0.85166f, -0.04784f, -0.07191f,0,0,  0.48172f, 1.00612f, 0.21637f,0,0,  -0.33338f, 0.04172f, 0.85554f,0,0,  0,0,0,1,0,  0,0,0,0,1 };
    }

    internal static class Program
    {
        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            if (!Native.MagInitialize())
            {
                MessageBox.Show("Could not start the Windows screen-color engine (Magnification API). Requires Windows 8 or later.",
                    "OpticQuiz Corrector", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }
            Application.Run(new TrayApp());
            Native.MagUninitialize();
        }
    }

    internal class TrayApp : ApplicationContext
    {
        private readonly NotifyIcon _tray;

        public TrayApp()
        {
            var menu = new ContextMenuStrip();
            menu.Items.Add("Recommended (helps all types)", null, (s, e) => Apply(Matrices.Recommended));
            menu.Items.Add("Deuteranopia (green-weak)", null, (s, e) => Apply(Matrices.Deuteranopia));
            menu.Items.Add("Protanopia (red-weak)", null, (s, e) => Apply(Matrices.Protanopia));
            menu.Items.Add("Tritanopia (blue-yellow)", null, (s, e) => Apply(Matrices.Tritanopia));
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add("Off (normal colors)", null, (s, e) => Apply(Matrices.Off));
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add("Exit", null, (s, e) => ExitApp());

            _tray = new NotifyIcon
            {
                Icon = LoadTrayIcon(),
                Text = "OpticQuiz Colorblind Corrector — click to choose a mode",
                Visible = true,
                ContextMenuStrip = menu
            };
            // Left-click opens the same menu (so a single click reaches it).
            _tray.MouseClick += (s, e) => { if (e.Button == MouseButtons.Left) menu.Show(Cursor.Position); };
        }

        private static Icon LoadTrayIcon()
        {
            try
            {
                string p = Path.Combine(AppContext.BaseDirectory, "app.ico");
                if (File.Exists(p)) return new Icon(p);
                var extracted = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
                if (extracted != null) return extracted;
            }
            catch { /* fall through to default */ }
            return SystemIcons.Application;
        }

        private void Apply(float[] matrix)
        {
            var eff = new Native.MAGCOLOREFFECT { transform = matrix };
            Native.MagSetFullscreenColorEffect(ref eff);
        }

        private void ExitApp()
        {
            Apply(Matrices.Off);      // restore normal colors on the way out
            _tray.Visible = false;
            _tray.Dispose();
            ExitThread();
        }
    }
}
