export interface PriorityRule {
  id: string;
  departmentKeyword: string;
  targetPrize: string;
  probabilityPercent: number;
}

export interface AppSettings {
  schoolName: string;
  prizesText: string;
  priorityDepartment: string;
  priorityTargetPrize: string;
  priorityRate: number;
  extraPriorityRules?: PriorityRule[];
}

export function generateStandaloneHtml(settings: AppSettings): string {
  const safeSchoolName = settings.schoolName.replace(/"/g, '&quot;');
  const defaultSettingsJson = JSON.stringify(settings, null, 2);

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Vòng Quay Chiếc Nón Kỳ Diệu - Ngày Hội Việc Làm</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&family=Montserrat:wght@700;800;900&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Be Vietnam Pro', system-ui, sans-serif;
      background: radial-gradient(circle at 50% 0%, #1e1b4b 0%, #090d16 70%);
      color: #f8fafc;
      min-height: 100vh;
    }
    .font-display {
      font-family: 'Montserrat', 'Be Vietnam Pro', sans-serif;
    }
    .admin-locked {
      filter: blur(6px);
      pointer-events: none;
      user-select: none;
    }
    .tabular-nums {
      font-variant-numeric: tabular-nums;
    }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.5); }
    ::-webkit-scrollbar-thumb { background: rgba(245, 158, 11, 0.5); border-radius: 3px; }
  </style>
</head>
<body class="antialiased selection:bg-amber-400 selection:text-slate-950">
  <!-- Confetti Canvas Overlay -->
  <canvas id="confettiCanvas" class="fixed inset-0 pointer-events-none z-50 w-full h-full"></canvas>

  <!-- Header -->
  <header class="border-b border-amber-500/20 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
    <div class="max-w-[1440px] mx-auto px-4 sm:px-6 py-3.5 flex flex-col xl:flex-row items-center justify-between gap-3">
      <div class="flex items-center gap-3 shrink-0">
        <div class="h-12 w-12 rounded-xl bg-white shadow-md p-1 flex items-center justify-center border border-slate-700/60 shrink-0 overflow-hidden">
          <img src="/assets/aistudio/9D442E44-DA18-4359-A1C0-B96CEA80BA07-removebg-preview_388b18da.png" alt="Thai Viet Corporation" class="h-full w-full object-contain" />
        </div>
        <div class="text-left">
          <div class="text-xs sm:text-sm font-black tracking-wide uppercase text-amber-400 font-display">
            CÔNG TY CỔ PHẦN THÁI VIỆT CORPORATION
          </div>
          <div class="text-[11px] text-slate-400 font-medium">
            Bộ phận Tuyển dụng &amp; Kết nối Sinh viên
          </div>
        </div>
      </div>

      <h1 id="headerTitle" class="font-display font-black text-lg sm:text-2xl lg:text-[24px] text-center tracking-tight leading-snug bg-gradient-to-r from-amber-200 via-amber-400 to-orange-400 bg-clip-text text-transparent drop-shadow-sm max-w-3xl">
        NGÀY HỘI VIỆC LÀM CÙNG TRƯỜNG ${safeSchoolName.toUpperCase()}
      </h1>
    </div>
  </header>

  <!-- Main Content: 60% Left - 40% Right -->
  <main class="max-w-[1440px] mx-auto px-4 sm:px-6 py-6">
    <div class="flex flex-col lg:flex-row gap-6 items-stretch">
      
      <!-- CỘT TRÁI (60%): VÒNG QUAY CHIẾC NÓN KỲ DIỆU -->
      <section class="w-full lg:w-[60%] bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-7 flex flex-col items-center justify-between shadow-2xl relative overflow-hidden">
        <!-- Wheel Container -->
        <div class="relative flex items-center justify-center my-2 w-full max-w-[560px] aspect-square">
          <!-- Outer Decorative Rim Glow -->
          <div class="absolute inset-2 rounded-full bg-gradient-to-tr from-amber-500/20 via-red-600/15 to-indigo-500/20 blur-2xl pointer-events-none"></div>

          <!-- Top Pointer (Kim chỉ tại đỉnh 12h) -->
          <div id="wheelPointer" class="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20 pointer-events-none transition-transform duration-75" style="transform-origin: 50% 12px;">
            <svg width="58" height="70" viewBox="0 0 58 70" fill="none" xmlns="http://www.w3.org/2000/svg" class="drop-shadow-[0_8px_14px_rgba(0,0,0,0.75)]">
              <path d="M29 67L8 19C4.8 11 10.8 2 19.5 2H38.5C47.2 2 53.2 11 50 19L29 67Z" fill="url(#pointerGrad)" stroke="#FEF08A" stroke-width="3"/>
              <circle cx="29" cy="18" r="7.5" fill="#7F1D1D" stroke="#FDE047" stroke-width="2.5"/>
              <defs>
                <linearGradient id="pointerGrad" x1="29" y1="2" x2="29" y2="67" gradientUnits="userSpaceOnUse">
                  <stop stop-color="#FEF08A"/>
                  <stop offset="0.45" stop-color="#F59E0B"/>
                  <stop offset="1" stop-color="#DC2626"/>
                </linearGradient>
              </defs>
            </svg>
          </div>

          <!-- HTML5 Canvas Wheel -->
          <canvas id="wheelCanvas" width="720" height="720" class="w-full h-full rounded-full shadow-[0_0_55px_rgba(0,0,0,0.85)]"></canvas>

          <!-- Center Spin Button (QUAY NGAY) -->
          <button id="centerSpinBtn" type="button" class="absolute z-20 w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-b from-yellow-200 via-amber-400 to-amber-600 p-1.5 shadow-[0_0_35px_rgba(245,158,11,0.75)] hover:scale-105 active:scale-95 transition-transform cursor-pointer focus:outline-none">
            <div class="w-full h-full rounded-full bg-gradient-to-b from-red-600 via-red-700 to-red-950 border-2 border-amber-200 flex flex-col items-center justify-center text-center px-2 shadow-inner">
              <span class="font-display font-black text-white text-sm sm:text-base leading-tight tracking-wider drop-shadow">QUAY<br/>NGAY</span>
            </div>
          </button>
        </div>

        <!-- Bottom Action Bar -->
        <div class="w-full mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span id="spinCountBadge" class="font-mono tabular-nums text-slate-400">Tổng lượt quay: 0</span>
          <span id="wheelPrizeCountText" class="font-mono tabular-nums font-semibold text-amber-300">Số ô quà: 8 ô</span>
        </div>
      </section>

      <!-- CỘT PHẢI (40%): THÔNG TIN SINH VIÊN (TRÊN) + QUẢN TRỊ ADMIN (DƯỚI) -->
      <div class="w-full lg:w-[40%] flex flex-col gap-6">
        
        <!-- KHỐI 1: THÔNG TIN SINH VIÊN (Ở TRÊN) -->
        <section class="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl">
          <div class="flex items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-800">
            <div>
              <h2 class="font-display font-bold text-lg text-white">NHẬP THÔNG TIN ĐỂ THAM GIA</h2>
              <p class="text-xs text-slate-400 mt-0.5">Điền đầy đủ 4 thông tin bắt buộc trước khi bấm quay thưởng</p>
            </div>
            <span class="text-xs font-medium text-amber-400">Bắt buộc *</span>
          </div>

          <form id="studentForm" class="space-y-4" novalidate>
            <!-- 1. Nhập tên sinh viên -->
            <div>
              <label for="studentName" class="block text-xs font-semibold text-slate-300 mb-1.5">
                1. Họ và tên sinh viên <span class="text-red-400">*</span>
              </label>
              <input id="studentName" type="text" required placeholder="Ví dụ: Nguyễn Văn A"
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-amber-400 transition" />
            </div>

            <!-- 2. Số điện thoại -->
            <div>
              <label for="studentPhone" class="block text-xs font-semibold text-slate-300 mb-1.5">
                2. Số điện thoại liên hệ <span class="text-red-400">*</span>
              </label>
              <input id="studentPhone" type="tel" required placeholder="Ví dụ: 0901234567"
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm font-mono tabular-nums focus:outline-none focus:border-amber-400 transition" />
            </div>

            <!-- 3. Nhập Khoa học -->
            <div>
              <label for="studentDepartment" class="block text-xs font-semibold text-slate-300 mb-1.5">
                3. Khoa theo học <span class="text-red-400">*</span>
              </label>
              <input id="studentDepartment" type="text" list="departmentSuggestions" required placeholder="Chọn hoặc tự gõ tên Khoa (VD: Chăn nuôi thú y, CNTT...)"
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-amber-400 transition" />
              <datalist id="departmentSuggestions">
                <option value="Chăn nuôi thú y"></option>
                <option value="Thú y"></option>
                <option value="Chăn nuôi"></option>
                <option value="Công nghệ thông tin"></option>
                <option value="Kinh tế"></option>
                <option value="Quản trị kinh doanh"></option>
                <option value="Nông học"></option>
                <option value="Cơ khí - Công nghệ"></option>
                <option value="Công nghệ thực phẩm"></option>
                <option value="Thủy sản"></option>
                <option value="Môi trường và Tài nguyên"></option>
                <option value="Ngoại ngữ"></option>
              </datalist>
            </div>

            <!-- 4. Sinh viên thuộc năm thứ -->
            <div>
              <label for="studentYear" class="block text-xs font-semibold text-slate-300 mb-1.5">
                4. Sinh viên thuộc năm thứ <span class="text-red-400">*</span>
              </label>
              <select id="studentYear" required
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-amber-400 transition">
                <option value="">-- Chọn năm học hiện tại --</option>
                <option value="Năm 1">Năm 1</option>
                <option value="Năm 2">Năm 2</option>
                <option value="Năm 3">Năm 3</option>
                <option value="Năm 4">Năm 4</option>
                <option value="Năm cuối / Mới tốt nghiệp">Năm cuối / Mới tốt nghiệp</option>
              </select>
            </div>

            <!-- Error / Validation Message -->
            <div id="studentErrorBox" class="hidden px-3.5 py-2.5 rounded-xl bg-red-950/80 border border-red-500/50 text-red-200 text-xs font-medium"></div>

            <!-- Confirm Button -->
            <button type="submit" class="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-display font-extrabold text-sm shadow-lg shadow-amber-500/20 transition cursor-pointer">
              Xác nhận thông tin &amp; Sẵn sàng quay
            </button>
          </form>

          <!-- Lịch sử trúng quà & Xuất Excel/CSV -->
          <div class="mt-6 pt-5 border-t border-slate-800">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <h3 class="text-sm font-bold text-slate-200">Danh sách sinh viên trúng quà</h3>
                <p id="historySubCount" class="text-xs text-slate-400 tabular-nums">Tổng cộng: 0 sinh viên</p>
              </div>
              <div class="flex items-center gap-2">
                <button id="exportCsvBtn" type="button" class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition cursor-pointer whitespace-nowrap">
                  📥 Xuất file Excel/CSV
                </button>
                <button id="clearHistoryBtn" type="button" class="px-2.5 py-1.5 rounded-lg border border-slate-700 hover:border-red-500/50 text-slate-400 hover:text-red-300 text-xs transition cursor-pointer whitespace-nowrap">
                  Xóa lịch sử
                </button>
              </div>
            </div>

            <div class="overflow-x-auto max-h-56 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/70">
              <table class="w-full text-left border-collapse text-xs">
                <thead class="bg-slate-900/90 text-slate-400 sticky top-0">
                  <tr>
                    <th class="py-2.5 px-3 font-semibold">Sinh viên</th>
                    <th class="py-2.5 px-3 font-semibold">SĐT</th>
                    <th class="py-2.5 px-3 font-semibold">Khoa · Năm</th>
                    <th class="py-2.5 px-3 font-semibold text-amber-400">Quà trúng</th>
                  </tr>
                </thead>
                <tbody id="historyTableBody" class="divide-y divide-slate-800/70 text-slate-200">
                  <tr>
                    <td colspan="4" class="py-6 text-center text-slate-500">Chưa có lượt quay nào. Hãy nhập thông tin và quay ngay!</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <!-- KHỐI 2: KHU VỰC QUẢN TRỊ ADMIN (Ở DƯỚI - MẶC ĐỊNH BLUR + OVERLAY) -->
        <section class="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
          <div class="flex items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-800">
            <div>
              <h2 class="font-display font-bold text-lg text-white">2. Khu Vực Quản Trị (Admin)</h2>
              <p class="text-xs text-slate-400 mt-0.5">Cấu hình tên trường, danh sách quà &amp; trọng số ưu tiên theo Khoa</p>
            </div>
            <button id="lockAdminBtn" type="button" class="hidden px-3 py-1.5 rounded-lg bg-red-600/90 hover:bg-red-500 text-white text-xs font-semibold transition cursor-pointer whitespace-nowrap">
              🔒 Khóa lại (Đăng xuất Admin)
            </button>
          </div>

          <!-- Nội dung Admin (Mặc định bị làm mờ filter: blur(6px)) -->
          <div id="adminContentArea" class="admin-locked space-y-4 transition-all duration-200">
            <!-- 1. Nhập tên trường -->
            <div>
              <label for="adminSchoolName" class="block text-xs font-semibold text-slate-300 mb-1.5">
                1. Tên Trường Đại Học / Cao Đẳng (Cập nhật Header thời gian thực)
              </label>
              <input id="adminSchoolName" type="text" placeholder="Ví dụ: Đại học Nông Lâm TP.HCM"
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-amber-400" />
            </div>

            <!-- 2. Danh sách phần quà (Textarea) -->
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label for="adminPrizesTextarea" class="block text-xs font-semibold text-slate-300">
                  2. Danh sách phần quà (Mỗi dòng 1 phần quà)
                </label>
                <span class="text-[11px] text-amber-400">Tự động chia lại ô vòng quay</span>
              </div>
              <textarea id="adminPrizesTextarea" rows="5" placeholder="Nhập mỗi dòng 1 phần quà..."
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-amber-400"></textarea>
            </div>

            <!-- 3. Điều chỉnh tỷ lệ ưu tiên theo Khoa -->
            <div class="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3">
              <div class="text-xs font-bold text-amber-400">
                3. Điều chỉnh tỷ lệ ưu tiên theo Khoa (Trọng số trúng quà đặc biệt)
              </div>

              <div>
                <label for="adminPriorityDept" class="block text-xs text-slate-300 mb-1">
                  Tên Khoa ưu tiên (Có thể nhập nhiều từ khóa cách nhau dấu phẩy)
                </label>
                <input id="adminPriorityDept" type="text" placeholder="Ví dụ: Chăn nuôi, Thú y"
                  class="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-amber-400" />
              </div>

              <div>
                <label for="adminTargetPrize" class="block text-xs text-slate-300 mb-1">
                  Phần quà mục tiêu ưu tiên
                </label>
                <select id="adminTargetPrize"
                  class="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-amber-400">
                </select>
              </div>

              <div>
                <div class="flex items-center justify-between text-xs mb-1">
                  <label for="adminPriorityRate" class="text-slate-300">Tỷ lệ ưu tiên trúng quà mục tiêu (%)</label>
                  <span id="adminPriorityRateLabel" class="font-mono font-bold text-amber-400 tabular-nums">75%</span>
                </div>
                <div class="flex items-center gap-3">
                  <input id="adminPriorityRate" type="range" min="0" max="100" step="1" value="75"
                    class="w-full accent-amber-400 cursor-pointer" />
                  <input id="adminPriorityRateInput" type="number" min="0" max="100" value="75"
                    class="w-16 px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-center font-mono text-xs text-amber-300 tabular-nums" />
                </div>
              </div>
            </div>

            <!-- 4. Nút Lưu cài đặt -->
            <div class="flex items-center gap-3 pt-2">
              <button id="saveAdminSettingsBtn" type="button" class="flex-1 py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-bold text-xs transition cursor-pointer">
                💾 Lưu cài đặt (LocalStorage)
              </button>
            </div>
            <div id="adminSaveToast" class="hidden text-xs text-emerald-400 font-medium text-center">
              ✓ Đã lưu toàn bộ cấu hình vào LocalStorage!
            </div>
          </div>

          <!-- Lớp phủ (Overlay) Đăng nhập Admin -->
          <div id="adminLockOverlay" class="absolute inset-0 z-10 bg-slate-950/75 backdrop-blur-[2px] flex flex-col items-center justify-center p-6">
            <div class="w-full max-w-xs bg-slate-900 border border-slate-700/80 rounded-2xl p-5 shadow-2xl">
              <div class="text-center mb-4">
                <div class="w-10 h-10 rounded-full bg-amber-400/15 border border-amber-400/40 text-amber-300 flex items-center justify-center mx-auto mb-2 text-lg">
                  🔐
                </div>
                <h3 class="font-display font-bold text-sm text-white">Khu Vực Dành Cho Admin</h3>
                <p class="text-[11px] text-slate-400 mt-0.5">Đăng nhập để điều chỉnh vòng quay &amp; tỷ lệ trúng quà</p>
              </div>

              <form id="adminLoginForm" class="space-y-3">
                <div>
                  <label class="block text-[11px] text-slate-300 mb-1">Tài khoản</label>
                  <input id="adminUsername" type="text" placeholder="Nhập tài khoản" required
                    class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-amber-400" />
                </div>
                <div>
                  <label class="block text-[11px] text-slate-300 mb-1">Mật khẩu</label>
                  <input id="adminPassword" type="password" placeholder="Nhập mật khẩu" required
                    class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-amber-400" />
                </div>
                <div id="adminLoginError" class="hidden text-[11px] text-red-400 font-medium">
                  Sai tài khoản hoặc mật khẩu!
                </div>
                <button type="submit" class="w-full py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-bold text-xs transition cursor-pointer">
                  Mở khóa cấu hình
                </button>
              </form>
            </div>
          </div>
        </section>

      </div>
    </div>
  </main>

  <!-- Modal Chúc Mừng Trúng Thưởng -->
  <div id="winnerModal" class="fixed inset-0 z-40 hidden items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
    <div class="w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-amber-400/70 rounded-3xl p-6 sm:p-8 text-center shadow-[0_0_60px_rgba(245,158,11,0.35)] relative">
      <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-300 to-orange-500 text-slate-950 flex items-center justify-center mx-auto mb-4 text-3xl shadow-lg">
        🎁
      </div>
      <p class="text-xs font-bold uppercase tracking-widest text-amber-400">Chúc Mừng Sinh Viên Trúng Thưởng</p>
      <h3 id="modalStudentName" class="font-display font-black text-2xl text-white mt-1">Nguyễn Văn A</h3>
      <p id="modalStudentMeta" class="text-xs text-slate-300 mt-1">Khoa Chăn nuôi thú y · Năm 4</p>

      <div class="my-6 py-4 px-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/20 to-red-500/15 border border-amber-400/40">
        <div class="text-xs text-amber-200 mb-1">Phần quà nhận được:</div>
        <div id="modalPrizeName" class="font-display font-black text-xl sm:text-2xl text-amber-300">Balo Laptop Cao Cấp</div>
      </div>

      <button id="closeWinnerModalBtn" type="button" class="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-display font-extrabold text-sm transition cursor-pointer">
        Hoàn tất &amp; Mời sinh viên tiếp theo
      </button>
    </div>
  </div>

  <!-- Nút âm thanh loa ở phía dưới cùng giao diện (chỉ icon loa, không có chữ) -->
  <div class="fixed bottom-5 right-5 z-30">
    <button id="toggleSoundBtn" type="button" class="w-12 h-12 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-400/70 shadow-2xl flex items-center justify-center text-slate-200 transition-all cursor-pointer backdrop-blur-md active:scale-95 group focus:outline-none focus:ring-2 focus:ring-amber-400/50" title="Bật/Tắt âm thanh" aria-label="Bật/Tắt âm thanh">
      <span id="soundIconSpan" class="text-xl">🔊</span>
    </button>
  </div>

  <script>
    // --- CẤU HÌNH MẶC ĐỊNH & LOCALSTORAGE ---
    const STORAGE_KEY_SETTINGS = 'CNKD_CAREER_FAIR_SETTINGS_V1';
    const STORAGE_KEY_HISTORY = 'CNKD_CAREER_FAIR_HISTORY_V1';

    const DEFAULT_SETTINGS = ${defaultSettingsJson};

    const SEGMENT_PALETTE = [
      { bg: '#DC2626', text: '#FFFFFF', accent: '#FCA5A5' }, // Đỏ Ruby
      { bg: '#F59E0B', text: '#0F172A', accent: '#FEF08A' }, // Vàng Hoàng Kim
      { bg: '#059669', text: '#FFFFFF', accent: '#6EE7B7' }, // Xanh Ngọc Lục Bảo
      { bg: '#2563EB', text: '#FFFFFF', accent: '#93C5FD' }, // Xanh Sapphire
      { bg: '#7C3AED', text: '#FFFFFF', accent: '#DDD6FE' }, // Tím Hoàng Gia
      { bg: '#EA580C', text: '#FFFFFF', accent: '#FDBA74' }, // Cam Rực Rỡ
      { bg: '#0D9488', text: '#FFFFFF', accent: '#99F6E4' }, // Xanh Cổ Vịt
      { bg: '#DB2777', text: '#FFFFFF', accent: '#FBCFE8' }  // Hồng Hồng Ngọc
    ];

    let appSettings = loadSettings();
    let historyList = loadHistory();
    let soundEnabled = true;
    let isSpinning = false;
    let currentRotation = 0; // radians
    let confirmedStudent = null;

    function loadSettings() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
        if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
      } catch (e) {}
      return { ...DEFAULT_SETTINGS };
    }

    function loadHistory() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
        if (raw) return JSON.parse(raw);
      } catch (e) {}
      return [];
    }

    function saveHistory() {
      try {
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(historyList));
      } catch (e) {}
    }

    function getPrizeList() {
      const lines = (appSettings.prizesText || '')
        .split('\\n')
        .map(s => s.trim())
        .filter(Boolean);
      return lines.length > 0 ? lines : ['Áo mưa cao cấp', 'Bút bi kỷ niệm', 'Móc khóa thương hiệu', 'Sổ tay sinh viên'];
    }

    // Bỏ dấu tiếng Việt để so khớp Khoa chính xác
    function normalizeVi(str) {
      return (str || '')
        .normalize('NFD')
        .replace(/[\\u0300-\\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toLowerCase()
        .trim();
    }

    // --- WEB AUDIO API SOUND ENGINE ---
    let audioCtx = null;
    function getAudioCtx() {
      if (!audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) audioCtx = new AudioContextClass();
      }
      if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
      return audioCtx;
    }

    function playTickSound() {
      if (!soundEnabled) return;
      const ctx = getAudioCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1150, now);
      osc.frequency.exponentialRampToValueAtTime(280, now + 0.035);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.04);
    }

    function playWinFanfare() {
      if (!soundEnabled) return;
      const ctx = getAudioCtx();
      if (!ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.50, 783.99, 1046.50];
      const times = [0, 0.12, 0.24, 0.36, 0.52, 0.66];
      const durations = [0.1, 0.1, 0.1, 0.14, 0.12, 0.45];
      notes.forEach((freq, idx) => {
        const now = ctx.currentTime + times[idx];
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + durations[idx]);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + durations[idx] + 0.02);
      });
    }

    // --- VẼ VÒNG QUAY HTML5 CANVAS ---
    const wheelCanvas = document.getElementById('wheelCanvas');
    const wheelCtx = wheelCanvas.getContext('2d');

    function drawWheel() {
      const prizes = getPrizeList();
      const n = prizes.length;
      const arc = (Math.PI * 2) / n;
      const width = wheelCanvas.width;
      const height = wheelCanvas.height;
      const cx = width / 2;
      const cy = height / 2;
      const outerRadius = width / 2 - 12;
      const wheelRadius = outerRadius - 18;

      wheelCtx.clearRect(0, 0, width, height);

      // Vành ngoài Chiếc Nón Kỳ Diệu
      wheelCtx.save();
      wheelCtx.beginPath();
      wheelCtx.arc(cx, cy, outerRadius, 0, Math.PI * 2);
      const rimGrad = wheelCtx.createLinearGradient(0, 0, width, height);
      rimGrad.addColorStop(0, '#FDE047');
      rimGrad.addColorStop(0.5, '#D97706');
      rimGrad.addColorStop(1, '#78350F');
      wheelCtx.fillStyle = rimGrad;
      wheelCtx.fill();
      wheelCtx.lineWidth = 4;
      wheelCtx.strokeStyle = '#FEF9C3';
      wheelCtx.stroke();

      // Vòng nền đen đậm giữa vành
      wheelCtx.beginPath();
      wheelCtx.arc(cx, cy, wheelRadius + 6, 0, Math.PI * 2);
      wheelCtx.fillStyle = '#0F172A';
      wheelCtx.fill();
      wheelCtx.restore();

      // Vẽ từng ô quạt
      for (let i = 0; i < n; i++) {
        const startAngle = currentRotation + i * arc;
        const endAngle = startAngle + arc;
        const palette = SEGMENT_PALETTE[i % SEGMENT_PALETTE.length];

        wheelCtx.save();
        wheelCtx.beginPath();
        wheelCtx.moveTo(cx, cy);
        wheelCtx.arc(cx, cy, wheelRadius, startAngle, endAngle);
        wheelCtx.closePath();
        wheelCtx.fillStyle = palette.bg;
        wheelCtx.fill();
        wheelCtx.lineWidth = 2.5;
        wheelCtx.strokeStyle = '#FEF08A';
        wheelCtx.stroke();

        // Vẽ tên phần quà
        wheelCtx.translate(cx, cy);
        wheelCtx.rotate(startAngle + arc / 2);
        wheelCtx.textAlign = 'right';
        wheelCtx.textBaseline = 'middle';
        wheelCtx.fillStyle = palette.text;
        const fontSize = n > 12 ? 15 : n > 8 ? 17 : 20;
        wheelCtx.font = '800 ' + fontSize + 'px "Be Vietnam Pro", sans-serif';
        const label = prizes[i].length > 24 ? prizes[i].slice(0, 22) + '…' : prizes[i];
        wheelCtx.fillText(label, wheelRadius - 24, 0);
        wheelCtx.restore();
      }

      // Vẽ các đinh chốt (Pegs) và đèn LED xung quanh vành nón
      const totalPegs = Math.max(n * 2, 16);
      for (let i = 0; i < totalPegs; i++) {
        const angle = currentRotation + (i * Math.PI * 2) / totalPegs;
        const px = cx + Math.cos(angle) * (wheelRadius + 9);
        const py = cy + Math.sin(angle) * (wheelRadius + 9);
        wheelCtx.save();
        wheelCtx.beginPath();
        wheelCtx.arc(px, py, 5, 0, Math.PI * 2);
        wheelCtx.fillStyle = i % 2 === 0 ? '#FEF08A' : '#FFFFFF';
        wheelCtx.fill();
        wheelCtx.lineWidth = 1.5;
        wheelCtx.strokeStyle = '#78350F';
        wheelCtx.stroke();
        wheelCtx.restore();
      }

      document.getElementById('wheelPrizeCountText').textContent = 'Số ô quà: ' + n;
    }

    // --- THUẬT TOÁN CHỌN QUÀ & TRỌNG SỐ ƯU TIÊN KHOA ---
    function selectWinningPrizeIndex(studentDept) {
      const prizes = getPrizeList();
      const normStudentDept = normalizeVi(studentDept);
      const priorityKeywords = (appSettings.priorityDepartment || '')
        .split(',')
        .map(k => normalizeVi(k))
        .filter(Boolean);

      const isPriorityDept = priorityKeywords.some(kw =>
        normStudentDept.includes(kw) || kw.includes(normStudentDept)
      );

      const rate = Math.max(0, Math.min(100, Number(appSettings.priorityRate) || 0));
      const targetPrizeNorm = normalizeVi(appSettings.priorityTargetPrize);

      if (isPriorityDept && rate > 0 && targetPrizeNorm) {
        const matchingIndices = [];
        prizes.forEach((p, idx) => {
          if (normalizeVi(p) === targetPrizeNorm) matchingIndices.push(idx);
        });

        if (matchingIndices.length > 0) {
          const roll = Math.random() * 100;
          if (roll < rate) {
            return matchingIndices[Math.floor(Math.random() * matchingIndices.length)];
          }
        }
      }

      return Math.floor(Math.random() * prizes.length);
    }

    // --- LOGIC QUAY VÒNG QUAY ---
    function validateAndGetStudent() {
      const name = document.getElementById('studentName').value.trim();
      const phone = document.getElementById('studentPhone').value.trim();
      const department = document.getElementById('studentDepartment').value.trim();
      const year = document.getElementById('studentYear').value.trim();
      const errorBox = document.getElementById('studentErrorBox');

      const phoneRegex = /^(0|\\+84)(3|5|7|8|9)[0-9]{8}$/;
      const cleanPhone = phone.replace(/[\\s.-]/g, '');

      if (!name) {
        showError('Vui lòng nhập Họ và tên sinh viên trước khi quay!');
        document.getElementById('studentName').focus();
        return null;
      }
      if (!cleanPhone || !phoneRegex.test(cleanPhone)) {
        showError('Vui lòng nhập Số điện thoại Việt Nam hợp lệ (10 số, VD: 0901234567)!');
        document.getElementById('studentPhone').focus();
        return null;
      }
      if (!department) {
        showError('Vui lòng nhập hoặc chọn Khoa theo học!');
        document.getElementById('studentDepartment').focus();
        return null;
      }
      if (!year) {
        showError('Vui lòng chọn Sinh viên thuộc năm thứ mấy!');
        document.getElementById('studentYear').focus();
        return null;
      }

      errorBox.classList.add('hidden');
      return { name, phone: cleanPhone, department, year };
    }

    function showError(msg) {
      const errorBox = document.getElementById('studentErrorBox');
      errorBox.textContent = '⚠️ ' + msg;
      errorBox.classList.remove('hidden');
    }

    function startSpin() {
      if (isSpinning) return;
      const student = validateAndGetStudent();
      if (!student) return;
      confirmedStudent = student;

      const prizes = getPrizeList();
      const n = prizes.length;
      const arc = (Math.PI * 2) / n;
      const winningIndex = selectWinningPrizeIndex(student.department);

      // Kim chỉ ở đỉnh 12h tương ứng góc -Math.PI / 2 (tức 3 * Math.PI / 2)
      const pointerAngle = (3 * Math.PI) / 2;
      // Điểm dừng ngẫu nhiên an toàn trong khoảng 22% -> 78% của ô trúng thưởng
      const randomOffsetInSlice = (0.22 + Math.random() * 0.56) * arc;
      const desiredModAngle = (pointerAngle - (winningIndex * arc + randomOffsetInSlice) + Math.PI * 4) % (Math.PI * 2);
      const currentModAngle = ((currentRotation % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

      let deltaAngle = desiredModAngle - currentModAngle;
      if (deltaAngle < 0) deltaAngle += Math.PI * 2;

      const extraSpins = (6 + Math.floor(Math.random() * 3)) * Math.PI * 2; // 6 - 8 vòng
      const startRotation = currentRotation;
      const targetRotation = startRotation + extraSpins + deltaAngle;
      const duration = 5500; // 5.5 giây
      const startTime = performance.now();

      isSpinning = true;
      let lastTickIndex = Math.floor((startRotation / arc) * 2);
      const pointerEl = document.getElementById('wheelPointer');

      function animateWheel(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Quartic ease-out
        const easeOut = 1 - Math.pow(1 - progress, 4);
        currentRotation = startRotation + (targetRotation - startRotation) * easeOut;

        drawWheel();

        const currentTickIndex = Math.floor((currentRotation / arc) * 2);
        if (currentTickIndex !== lastTickIndex) {
          lastTickIndex = currentTickIndex;
          playTickSound();
          pointerEl.style.transform = 'translateX(-50%) rotate(-18deg)';
          setTimeout(() => {
            pointerEl.style.transform = 'translateX(-50%) rotate(0deg)';
          }, 55);
        }

        if (progress < 1) {
          requestAnimationFrame(animateWheel);
        } else {
          isSpinning = false;
          const wonPrize = prizes[winningIndex];
          onSpinComplete(student, wonPrize);
        }
      }

      requestAnimationFrame(animateWheel);
    }

    function onSpinComplete(student, wonPrize) {
      playWinFanfare();
      launchConfetti();

      const record = {
        id: Date.now().toString(),
        name: student.name,
        phone: student.phone,
        department: student.department,
        year: student.year,
        prize: wonPrize,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' + new Date().toLocaleDateString('vi-VN')
      };

      historyList.unshift(record);
      saveHistory();
      renderHistory();

      document.getElementById('modalStudentName').textContent = student.name;
      document.getElementById('modalStudentMeta').textContent = 'Khoa ' + student.department + ' · ' + student.year + ' · SĐT: ' + student.phone;
      document.getElementById('modalPrizeName').textContent = wonPrize;
      const modal = document.getElementById('winnerModal');
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }

    // --- CONFETTI PHÁO HOA ---
    const confettiCanvas = document.getElementById('confettiCanvas');
    const confettiCtx = confettiCanvas.getContext('2d');
    let confettiParticles = [];

    function resizeConfetti() {
      confettiCanvas.width = window.innerWidth;
      confettiCanvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeConfetti);
    resizeConfetti();

    function launchConfetti() {
      const colors = ['#FACC15', '#EF4444', '#10B981', '#3B82F6', '#EC4899', '#F97316'];
      for (let i = 0; i < 130; i++) {
        confettiParticles.push({
          x: window.innerWidth / 2,
          y: window.innerHeight / 2 - 60,
          vx: (Math.random() - 0.5) * 18,
          vy: (Math.random() - 0.85) * 18,
          size: 6 + Math.random() * 6,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * 360,
          vRot: (Math.random() - 0.5) * 12,
          alpha: 1
        });
      }
      requestAnimationFrame(stepConfetti);
    }

    function stepConfetti() {
      confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
      confettiParticles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35;
        p.rotation += p.vRot;
        p.alpha -= 0.008;
        confettiCtx.save();
        confettiCtx.globalAlpha = Math.max(0, p.alpha);
        confettiCtx.translate(p.x, p.y);
        confettiCtx.rotate((p.rotation * Math.PI) / 180);
        confettiCtx.fillStyle = p.color;
        confettiCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        confettiCtx.restore();
      });
      confettiParticles = confettiParticles.filter(p => p.alpha > 0 && p.y < confettiCanvas.height + 40);
      if (confettiParticles.length > 0) requestAnimationFrame(stepConfetti);
    }

    // --- CẬP NHẬT GIAO DIỆN & SỰ KIỆN ---
    function syncAdminUI() {
      const schoolTitle = (appSettings.schoolName || 'ĐẠI HỌC NÔNG LÂM TP.HCM').trim().toUpperCase();
      document.getElementById('headerTitle').textContent = 'NGÀY HỘI VIỆC LÀM CÙNG TRƯỜNG ' + schoolTitle;
      document.getElementById('adminSchoolName').value = appSettings.schoolName;
      document.getElementById('adminPrizesTextarea').value = appSettings.prizesText;
      document.getElementById('adminPriorityDept').value = appSettings.priorityDepartment;
      document.getElementById('adminPriorityRate').value = appSettings.priorityRate;
      document.getElementById('adminPriorityRateInput').value = appSettings.priorityRate;
      document.getElementById('adminPriorityRateLabel').textContent = appSettings.priorityRate + '%';
      populateTargetPrizeSelect();
      drawWheel();
    }

    function populateTargetPrizeSelect() {
      const select = document.getElementById('adminTargetPrize');
      const prizes = getPrizeList();
      select.innerHTML = '';
      prizes.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p;
        opt.textContent = p;
        select.appendChild(opt);
      });
      if (prizes.includes(appSettings.priorityTargetPrize)) {
        select.value = appSettings.priorityTargetPrize;
      } else if (prizes.length > 0) {
        appSettings.priorityTargetPrize = prizes[0];
        select.value = prizes[0];
      }
    }

    function renderHistory() {
      const tbody = document.getElementById('historyTableBody');
      document.getElementById('historySubCount').textContent = 'Tổng cộng: ' + historyList.length + ' sinh viên';
      document.getElementById('spinCountBadge').textContent = 'Đã quay: ' + historyList.length + ' lượt';

      if (historyList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="py-6 text-center text-slate-500">Chưa có lượt quay nào. Hãy nhập thông tin và quay ngay!</td></tr>';
        return;
      }

      tbody.innerHTML = historyList.map(item => \`
        <tr class="hover:bg-slate-900/60">
          <td class="py-2 px-3 font-medium text-white">\${item.name}</td>
          <td class="py-2 px-3 font-mono tabular-nums text-slate-300">\${item.phone}</td>
          <td class="py-2 px-3 text-slate-300">\${item.department} · \${item.year}</td>
          <td class="py-2 px-3 font-semibold text-amber-300">\${item.prize}</td>
        </tr>
      \`).join('');
    }

    // Event Listeners
    document.getElementById('studentForm').addEventListener('submit', function(e) {
      e.preventDefault();
      const student = validateAndGetStudent();
      if (student) {
        confirmedStudent = student;
        const statusEl = document.getElementById('readyStatusLabel');
        if (statusEl) {
          statusEl.textContent = '✓ Đã sẵn sàng: ' + student.name;
          statusEl.className = 'font-semibold text-emerald-400';
        }
      }
    });

    document.getElementById('centerSpinBtn').addEventListener('click', startSpin);

    document.getElementById('closeWinnerModalBtn').addEventListener('click', function() {
      const modal = document.getElementById('winnerModal');
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      document.getElementById('studentForm').reset();
      confirmedStudent = null;
      const statusEl = document.getElementById('readyStatusLabel');
      if (statusEl) {
        statusEl.textContent = '';
      }
    });

    document.getElementById('toggleSoundBtn').addEventListener('click', function() {
      soundEnabled = !soundEnabled;
      const iconSpan = document.getElementById('soundIconSpan');
      if (iconSpan) {
        iconSpan.textContent = soundEnabled ? '🔊' : '🔇';
      }
    });

    // Admin Login / Lock
    document.getElementById('adminLoginForm').addEventListener('submit', function(e) {
      e.preventDefault();
      const u = document.getElementById('adminUsername').value.trim();
      const p = document.getElementById('adminPassword').value;
      if (u === 'admin' && p === 'admintvc') {
        document.getElementById('adminLockOverlay').classList.add('hidden');
        document.getElementById('adminContentArea').classList.remove('admin-locked');
        document.getElementById('lockAdminBtn').classList.remove('hidden');
        document.getElementById('adminLoginError').classList.add('hidden');
        document.getElementById('adminPassword').value = '';
      } else {
        document.getElementById('adminLoginError').classList.remove('hidden');
      }
    });

    document.getElementById('lockAdminBtn').addEventListener('click', function() {
      document.getElementById('adminLockOverlay').classList.remove('hidden');
      document.getElementById('adminContentArea').classList.add('admin-locked');
      this.classList.add('hidden');
    });

    // Admin Live Controls
    document.getElementById('adminSchoolName').addEventListener('input', function() {
      appSettings.schoolName = this.value;
      const schoolTitle = (this.value || 'ĐẠI HỌC NÔNG LÂM TP.HCM').trim().toUpperCase();
      document.getElementById('headerTitle').textContent = 'NGÀY HỘI VIỆC LÀM CÙNG TRƯỜNG ' + schoolTitle;
    });

    document.getElementById('adminPrizesTextarea').addEventListener('input', function() {
      appSettings.prizesText = this.value;
      populateTargetPrizeSelect();
      drawWheel();
    });

    document.getElementById('adminPriorityDept').addEventListener('input', function() {
      appSettings.priorityDepartment = this.value;
    });

    document.getElementById('adminTargetPrize').addEventListener('change', function() {
      appSettings.priorityTargetPrize = this.value;
    });

    document.getElementById('adminPriorityRate').addEventListener('input', function() {
      appSettings.priorityRate = Number(this.value);
      document.getElementById('adminPriorityRateInput').value = this.value;
      document.getElementById('adminPriorityRateLabel').textContent = this.value + '%';
    });

    document.getElementById('adminPriorityRateInput').addEventListener('input', function() {
      const val = Math.max(0, Math.min(100, Number(this.value) || 0));
      appSettings.priorityRate = val;
      document.getElementById('adminPriorityRate').value = val;
      document.getElementById('adminPriorityRateLabel').textContent = val + '%';
    });

    document.getElementById('saveAdminSettingsBtn').addEventListener('click', function() {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(appSettings));
      const toast = document.getElementById('adminSaveToast');
      toast.classList.remove('hidden');
      setTimeout(() => toast.classList.add('hidden'), 3000);
    });

    // Xuất CSV
    document.getElementById('exportCsvBtn').addEventListener('click', function() {
      if (historyList.length === 0) return;
      const headers = ['STT', 'Họ và Tên', 'Số Điện Thoại', 'Khoa', 'Năm Học', 'Phần Quà Trúng', 'Thời Gian'];
      const rows = historyList.map((item, idx) => [
        idx + 1,
        '"' + item.name.replace(/"/g, '""') + '"',
        '"' + item.phone + '"',
        '"' + item.department.replace(/"/g, '""') + '"',
        '"' + item.year + '"',
        '"' + item.prize.replace(/"/g, '""') + '"',
        '"' + item.timestamp + '"'
      ]);
      const csvContent = '\\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Danh_Sach_Sinh_Vien_Trung_Qua_Ngay_Hoi_Viec_Lam.csv';
      a.click();
      URL.revokeObjectURL(url);
    });

    document.getElementById('clearHistoryBtn').addEventListener('click', function() {
      historyList = [];
      saveHistory();
      renderHistory();
    });

    // Khởi chạy
    syncAdminUI();
    renderHistory();
  </script>
</body>
</html>`;
}
