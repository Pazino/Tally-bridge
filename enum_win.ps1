Add-Type @"
  using System;
  using System.Runtime.InteropServices;
  using System.Text;
  public class WinEnum {
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
    [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);

    public static void Run(uint targetPid) {
      EnumWindows((hWnd, lParam) => {
        uint pId = 0;
        GetWindowThreadProcessId(hWnd, out pId);
        if (pId == targetPid) {
          StringBuilder sb = new StringBuilder(256);
          GetWindowText(hWnd, sb, 256);
          bool vis = IsWindowVisible(hWnd);
          Console.WriteLine("HWND: " + hWnd + " Vis: " + vis + " Title: [" + sb.ToString() + "]");
        }
        return true;
      }, IntPtr.Zero);
    }
  }
"@
[WinEnum]::Run(33448)
