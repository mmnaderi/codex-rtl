# codex-rtl

This CLI tool automatically injects a sophisticated RTL engine into Codex, adding support for Persian (Farsi), Arabic, Hebrew, and other RTL languages, along with a sleek UI to configure fonts and settings on the fly.

## Features

- **Smart Auto-Direction**: Automatically detects if a paragraph is RTL or LTR and aligns it perfectly.
- **Force RTL Mode**: Want everything aligned to the right? Just toggle the switch.
- **Custom Typography**: Define different fonts for your RTL text, English text, and Code blocks!
- **Line Height Control**: A precise slider to adjust the line height for better readability.
- **Persian Keyboard Fix**: Maps `Shift + 2` to type `@` instead of `٬` on Persian keyboards.
- **Beautiful Settings Panel**: A floating, non-intrusive UI widget at the bottom right corner.
- **Vazirmatn Built-in**: Comes with the beautiful Vazirmatn variable font by default.
- **Theme Compatibility**: Seamlessly adapts colors based on Codex's active theme, using native color variables.

## Installation

You don't need to download any files. Just run the following command in your terminal:

### macOS
Simply run:
```bash
brew install node # Skip this line if Node.js is already installed.
npx codex-rtl
```
> **First time?** If you get a "Permission Denied" error, the tool will **automatically open** the App Management settings page for you. Just enable the toggle for your terminal app, then run the command again. No `sudo` needed!
>
> You can also grant permission manually: `System Settings > Privacy & Security > App Management`.

### Linux
```bash
sudo apt install nodejs npm # Skip this line if Node.js is already installed.
sudo npx codex-rtl
```

### Windows
Open **PowerShell** as **Administrator** (Right-click -> Run as Administrator), then run:
```powershell
winget install OpenJS.NodeJS.LTS # Skip this line if Node.js is already installed.
npx codex-rtl
```

> [!WARNING]
> **App Updates:** Since updating the Codex application overwrites its internal files, the RTL patch will be removed. You will need to run the installation command again after each update to re-apply the patch.

## Restoring to Original (Uninstall)

If you ever want to revert Codex back to its original state (before the patch), simply run the command with the `--restore` flag:

```bash
npx codex-rtl --restore
```
*(On Linux, run with `sudo`. On Windows, run in an Administrator terminal)*

## How it works

This CLI tool:
1. Locates your Codex installation.
2. Creates a safe backup of the original `app.asar` file.
3. Extracts the application and safely injects the Smart RTL Engine into the core logic.
4. Repacks the application so you can start using it immediately.

## Contributing

Feel free to open issues or submit pull requests. Let's make Codex accessible and beautiful for everyone!

---

<div dir="rtl">

# پروژه Codex Smart RTL

یک پچِ هوشمند و زیبا برای پشتیبانی از زبان‌های راست‌به‌چپ (RTL) در نرم‌افزار Codex.

این ابزارِ خط فرمان (CLI) به صورت کاملاً خودکار یک موتور پیشرفتهٔ RTL را به هستهٔ برنامهٔ Codex تزریق می‌کند تا از زبان‌های فارسی، عربی و عبری به بهترین شکل پشتیبانی شود. همچنین یک پنل تنظیماتِ (UI) برای تغییر زندهٔ فونت‌ها در اختیار شما قرار می‌دهد.

## امکانات

- **راست‌چین هوشمند (Smart Auto-Direction)**: سیستم به طور خودکار تشخیص می‌دهد که پاراگراف شما با حرف انگلیسی شروع شده یا فارسی، و چیدمان را بر همان اساس تنظیم می‌کند.
- **حالت راست‌چینِ اجباری (Force RTL Mode)**: دوست دارید همه چیز (حتی پیام‌های انگلیسی) کاملاً در سمت راست قرار بگیرند؟ فقط کافیست سوئیچ را روشن کنید!
- **تنظیماتِ پیشرفتهِ فونت**: می‌توانید برای متون فارسی، متون انگلیسی و کدهای برنامه‌نویسیِ داخل چت، فونت‌های کاملاً جداگانه‌ای تعریف کنید.
- **کنترل فاصلهٔ خطوط (Line Height)**: با استفاده از اسلایدر می‌توانید فاصلهٔ خطوط را برای خوانایی بهتر متن تنظیم کنید.
- **حل مشکل کیبورد فارسی**: این ابزار کلید ترکیبی `Shift + 2` روی کیبورد فارسی را اصلاح می‌کند تا به جای «٬» علامت `@` تایپ شود.
- **پنل تنظیمات زیبا**: تمام این تنظیمات در یک ویجتِ کوچک، مدرن و شناور در پایینِ صفحه قرار گرفته‌اند.
- **فونت وزیرمتن**: فونت زیبای Vazirmatn Variable به صورت پیش‌فرض در این افزونه گنجانده شده است.
- **همگام‌سازی خودکار با تم (Theme Compatibility)**: هماهنگی و تغییر پویای رنگ سوییچ‌های پنل با تغییر تم رنگی Codex به صورت کاملاً بومی.

## آموزش نصب

بدون نیاز به دانلود هیچ فایلی، فقط کافیست دستور زیر را در ترمینال سیستم خود اجرا کنید:

### در مک (macOS)
کافیست دستور زیر را اجرا کنید:
```bash
brew install node # اگر Node.js از قبل نصب است، این خط را رد کنید.
npx codex-rtl
```
> **اولین بار؟** اگر خطای Permission Denied دریافت کردید، ابزار به صورت **خودکار** صفحهٔ تنظیمات App Management را برای شما باز می‌کند. فقط سوئیچ ترمینال خود (مثلاً Terminal، iTerm2 یا VS Code) را فعال کنید و دوباره دستور را اجرا کنید. نیازی به `sudo` نیست!
>
> همچنین می‌توانید به صورت دستی به مسیر `System Settings > Privacy & Security > App Management` بروید.

### در لینوکس
```bash
sudo apt install nodejs npm # اگر Node.js از قبل نصب است، این خط را رد کنید.
sudo npx codex-rtl
```

### در ویندوز
برنامهٔ **PowerShell** را در حالت **Administrator** (راست‌کلیک -> Run as Administrator) باز کنید و دستور زیر را بنویسید:
```powershell
winget install OpenJS.NodeJS.LTS # اگر Node.js از قبل نصب است، این خط را رد کنید.
npx codex-rtl
```

> [!WARNING]
> **به‌روزرسانی برنامه:** از آنجا که آپدیت کردنِ برنامهٔ Codex کدهای آن را بازنویسی می‌کند، پچِ اعمال‌شده از بین خواهد رفت و لازم است پس از هر بار آپدیت، دستور نصب را مجدداً اجرا کنید.

## بازگردانی به حالت اولیه (Uninstall)

اگر زمانی خواستید Codex را به حالتِ اولیه (قبل از نصب این پچ) برگردانید، فقط کافیست دستور بالا را با فلگ `--restore` اجرا کنید:

```bash
npx codex-rtl --restore
```
*(در لینوکس با `sudo` اجرا کنید. کاربران ویندوز این دستور را در یک ترمینال ادمین اجرا کنند)*

## این ابزار چگونه کار می‌کند؟

1. ابزار به صورت خودکار محل نصب Codex را روی سیستم شما پیدا می‌کند.
2. یک نسخهٔ پشتیبانِ امن از فایل اوریجینالِ `app.asar` تهیه می‌کند.
3. فایل را استخراج کرده و کدهای موتورِ RTL را به ایمن‌ترین شکل ممکن به هستهٔ برنامه تزریق می‌کند.
4. در نهایت برنامه را مجدداً بسته‌بندی می‌کند تا بتوانید بلافاصله از آن لذت ببرید.

## مشارکت در توسعه

با کمال میل از نظرات، گزارشِ باگ‌ها و Pull Request های شما استقبال می‌شود. 

</div>
