import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  Award,
  Send,
  User,
  BookOpen
} from 'lucide-react';
import { AppSettings, StudentSubmission, DEFAULT_QUESTIONS } from './types';
import {
  STORAGE_KEY_SUBMISSIONS,
  publishCloudSyncEvent,
  mergeSubmissionsList
} from './syncService';

interface ChallengePageProps {
  settings: AppSettings;
  onSubmitSuccess: (submission: StudentSubmission) => void;
}

const DEPARTMENT_SUGGESTIONS = [
  'Chăn nuôi thú y',
  'Chăn nuôi',
  'Thú y',
  'Công nghệ thông tin',
  'Kinh tế',
  'Quản trị kinh doanh',
  'Nông học',
  'Cơ khí - Công nghệ',
  'Công nghệ thực phẩm',
  'Thủy sản',
  'Môi trường và Tài nguyên',
  'Lâm nghiệp',
  'Ngoại ngữ',
  'Công nghệ sinh học'
];

const YEAR_OPTIONS = [
  'Năm 1',
  'Năm 2',
  'Năm 3',
  'Năm 4',
  'Năm cuối / Mới tốt nghiệp'
];

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

export default function ChallengePage({
  settings,
  onSubmitSuccess
}: ChallengePageProps) {
  const questions =
    Array.isArray(settings.questions) && settings.questions.length === 10
      ? settings.questions
      : DEFAULT_QUESTIONS;

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [school, setSchool] = useState(() => {
    if (typeof window !== 'undefined') {
      const urlSchool = new URLSearchParams(window.location.search).get('school')?.trim();
      if (urlSchool) return urlSchool;
    }
    return settings.schoolName?.trim() || 'Đại học Nông Lâm TP.HCM';
  });
  const [isSchoolManuallyEdited, setIsSchoolManuallyEdited] = useState(false);
  const [department, setDepartment] = useState('');
  const [year, setYear] = useState('');
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedResult, setSubmittedResult] = useState<StudentSubmission | null>(null);

  // Tự động cập nhật mục 3 (Tên Trường) theo đúng nội dung Tên Trường trên tiêu đề Header mà Admin đã nhập
  useEffect(() => {
    const adminSchool = settings.schoolName?.trim();
    if (adminSchool && !isSchoolManuallyEdited) {
      setSchool(adminSchool);
    }
  }, [settings.schoolName, isSchoolManuallyEdited]);

  const answeredCount = Object.keys(answers).length;

  const handleSelectOption = (questionIndex: number, optionIndex: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionIndex]: optionIndex
    }));
    if (errorMsg) setErrorMsg(null);
  };

  const handleSubmitChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmedName = name.trim();
    const cleanedPhone = phone.replace(/[\s.-]/g, '').trim();
    const trimmedSchool = school.trim();
    const trimmedDept = department.trim();
    const trimmedYear = year.trim();

    if (!trimmedName) {
      setErrorMsg('Vui lòng nhập Họ và Tên của bạn!');
      return;
    }

    const vnPhoneRegex = /^(0|\+84)(3|5|7|8|9|2)[0-9]{8,9}$/;
    if (!cleanedPhone || !vnPhoneRegex.test(cleanedPhone)) {
      setErrorMsg('Số điện thoại chưa hợp lệ! Vui lòng nhập đúng SĐT (Ví dụ: 0901234567).');
      return;
    }

    if (!trimmedSchool) {
      setErrorMsg('Vui lòng nhập Tên Trường của bạn!');
      return;
    }

    if (!trimmedDept) {
      setErrorMsg('Vui lòng nhập hoặc chọn Khoa Học của bạn!');
      return;
    }

    if (!trimmedYear) {
      setErrorMsg('Vui lòng chọn Sinh Viên Năm Thứ mấy!');
      return;
    }

    // Kiểm tra đã trả lời đủ 10 câu hỏi trắc nghiệm chưa
    for (let i = 0; i < questions.length; i++) {
      if (answers[i] === undefined) {
        setErrorMsg(`Bạn chưa chọn đáp án cho Câu hỏi số ${i + 1}. Vui lòng hoàn thành đủ 10 câu!`);
        const qEl = document.getElementById(`quiz-question-${i}`);
        qEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }

    setErrorMsg(null);
    setIsSubmitting(true);

    const orderedAnswers = questions.map((_, idx) => answers[idx]);
    let calculatedScore = 0;
    questions.forEach((q, idx) => {
      if (Number(orderedAnswers[idx]) === Number(q.correctIndex)) {
        calculatedScore += 1;
      }
    });

    const now = new Date();
    const formattedTime = `${now.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })} - ${now.toLocaleDateString('vi-VN')}`;

    const newSubmission: StudentSubmission = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: trimmedName,
      phone: cleanedPhone,
      school: trimmedSchool,
      department: trimmedDept,
      year: trimmedYear,
      answers: orderedAnswers,
      score: calculatedScore,
      totalQuestions: questions.length,
      submittedAt: formattedTime,
      hasSpun: false
    };

    // 1. Lưu ngay vào LocalStorage để đồng bộ tức thì nếu cùng thiết bị
    try {
      const existingRaw = localStorage.getItem(STORAGE_KEY_SUBMISSIONS);
      const existingList: StudentSubmission[] = existingRaw ? JSON.parse(existingRaw) : [];
      const merged = mergeSubmissionsList([newSubmission], existingList);
      localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify(merged));
    } catch {
      // Ignore storage error
    }

    // 2. Gửi đồng thời lên Server API và Cloud Real-Time Relay để trang Vòng Quay nhận ngay lập tức
    let finalSub: StudentSubmission = newSubmission;

    try {
      const [apiRes] = await Promise.allSettled([
        fetch('/api/submissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newSubmission)
        }),
        publishCloudSyncEvent({
          type: 'NEW_SUBMISSION',
          submission: newSubmission
        })
      ]);

      if (apiRes.status === 'fulfilled' && apiRes.value.ok) {
        const data = await apiRes.value.json();
        if (data?.submission) {
          finalSub = data.submission;
        }
      }
    } catch {
      // Fallback
    } finally {
      setSubmittedResult(finalSub);
      onSubmitSuccess(finalSub);
      setIsSubmitting(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 pb-14">
      <main className="max-w-3xl mx-auto px-4 pt-6">
        <div className="mb-5">
          <h1 className="font-display font-black text-xl sm:text-2xl text-blue-700 tracking-tight uppercase">
            THỬ THÁCH NHẬN QUÀ
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Điền đầy đủ thông tin sinh viên và hoàn thành 10 câu hỏi trắc nghiệm bên dưới
          </p>
        </div>

        {submittedResult ? (
          /* MÀN HÌNH KẾT QUẢ CHẤM ĐIỂM TỰ ĐỘNG (KHÔNG HIỂN THỊ ĐÁP ÁN ĐÚNG, KHÔNG CÓ NÚT LÀM LƯỢT MỚI & KHÔNG CÓ NÚT CHUYỂN TRANG) */
          <div className="bg-white border-2 border-blue-500 rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-md">
              <Award className="w-9 h-9" />
            </div>

            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-blue-600">
                ✓ Đã nộp bài &amp; chuyển thông tin sang Vòng Quay thành công
              </div>
              <h2 className="font-display font-black text-2xl sm:text-3xl text-slate-900 mt-1">
                {submittedResult.name}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                {submittedResult.school} · Khoa{' '}
                <strong className="text-blue-700">{submittedResult.department}</strong> ·{' '}
                {submittedResult.year}
              </p>
              <p className="text-xs font-mono tabular-nums text-slate-500 mt-0.5">
                SĐT: {submittedResult.phone}
              </p>
            </div>

            {/* Khung Điểm Số */}
            <div className="py-5 px-6 rounded-2xl bg-blue-50/80 border border-blue-300 max-w-md mx-auto">
              <div className="text-xs text-blue-800 uppercase tracking-wider font-semibold">
                Kết quả bài trắc nghiệm của bạn
              </div>
              <div className="font-display font-black text-4xl sm:text-5xl text-blue-600 my-2 tabular-nums">
                {submittedResult.score} / {submittedResult.totalQuestions}
              </div>
              <div className="text-xs font-medium text-slate-600">
                Trả lời đúng <strong className="text-blue-900">{submittedResult.score}</strong>{' '}
                trên tổng số{' '}
                <strong className="text-blue-900">{submittedResult.totalQuestions}</strong> câu hỏi
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-xs sm:text-sm leading-relaxed">
              Thông tin của bạn đã được chuyển trực tiếp tới{' '}
              <strong>Danh Sách Sinh Viên Tham Gia Thử Thách</strong> trên màn hình{' '}
              <strong>Vòng Quay Chiếc Nón Kỳ Diệu</strong>. Hãy đến khu vực vòng quay để bấm{' '}
              <strong>QUAY NGAY</strong> nhận quà!
            </div>
          </div>
        ) : (
          /* BIỂU MẪU NHẬP LIỆU SINH VIÊN + 10 CÂU HỎI TRẮC NGHIỆM (TONE XANH DƯƠNG) */
          <form onSubmit={handleSubmitChallenge} className="space-y-6" noValidate>
            {/* KHỐI 1: THÔNG TIN CÁ NHÂN SINH VIÊN */}
            <section className="bg-white border border-blue-100 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-blue-100">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  <h2 className="font-display font-bold text-base sm:text-lg text-blue-900">
                    Phần 1: Thông Tin Sinh Viên
                  </h2>
                </div>
                <span className="text-xs font-semibold text-blue-600">Bắt buộc *</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Họ và Tên */}
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-blue-900 mb-1.5">
                    1. Họ và Tên <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Văn A"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-blue-600 transition"
                  />
                </div>

                {/* 2. Số Điện Thoại */}
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-blue-900 mb-1.5">
                    2. Số Điện Thoại <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ví dụ: 0901234567"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-sm font-mono tabular-nums focus:outline-none focus:border-blue-600 transition"
                  />
                </div>

                {/* 3. Tên Trường */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-blue-900 mb-1.5">
                    3. Tên Trường <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={school}
                    onChange={(e) => {
                      setSchool(e.target.value);
                      setIsSchoolManuallyEdited(true);
                    }}
                    placeholder="Ví dụ: Đại học Nông Lâm TP.HCM"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-blue-600 transition"
                  />
                </div>

                {/* 4. Khoa Học */}
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-blue-900 mb-1.5">
                    4. Khoa Học <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    list="challengeDeptSuggestions"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="VD: Chăn nuôi thú y, CNTT..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-blue-600 transition"
                  />
                  <datalist id="challengeDeptSuggestions">
                    {DEPARTMENT_SUGGESTIONS.map((d) => (
                      <option key={d} value={d} />
                    ))}
                  </datalist>
                </div>

                {/* 5. Sinh Viên Năm Thứ */}
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-blue-900 mb-1.5">
                    5. Sinh Viên Năm Thứ <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-blue-600 transition"
                  >
                    <option value="">-- Chọn năm học --</option>
                    {YEAR_OPTIONS.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            {/* KHỐI 2: 10 CÂU HỎI TRẮC NGHIỆM */}
            <section className="bg-white border border-blue-100 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-blue-100 sticky top-0 bg-white/95 backdrop-blur-md z-20 py-2 -mx-2 px-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  <h2 className="font-display font-bold text-base sm:text-lg text-blue-900">
                    Phần 2: 10 Câu Hỏi Trắc Nghiệm
                  </h2>
                </div>
                <span className="text-xs font-mono tabular-nums font-semibold text-blue-700">
                  Đã trả lời: {answeredCount} / {questions.length} câu
                </span>
              </div>

              <div className="space-y-5">
                {questions.map((q, qIdx) => {
                  const selectedOpt = answers[qIdx];
                  return (
                    <div
                      key={q.id || qIdx}
                      id={`quiz-question-${qIdx}`}
                      className={`p-4 sm:p-5 rounded-2xl border transition ${
                        selectedOpt !== undefined
                          ? 'bg-blue-50/50 border-blue-400'
                          : 'bg-slate-50/70 border-slate-200'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 mb-3.5">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-100 border border-blue-300 text-blue-800 font-display font-bold text-xs shrink-0 mt-0.5 tabular-nums">
                          {qIdx + 1}
                        </span>
                        <h3 className="text-sm sm:text-base font-semibold text-blue-950 leading-snug">
                          {q.question}
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 gap-2.5">
                        {q.options.map((optText, optIdx) => {
                          const isSelected = selectedOpt === optIdx;
                          return (
                            <button
                              key={optIdx}
                              type="button"
                              onClick={() => handleSelectOption(qIdx, optIdx)}
                              className={`w-full text-left px-3.5 py-3 rounded-xl border text-xs sm:text-sm flex items-start gap-3 transition cursor-pointer ${
                                isSelected
                                  ? 'bg-blue-100/90 border-blue-600 text-blue-950 font-semibold shadow-xs'
                                  : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50/40'
                              }`}
                            >
                              <span
                                className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold shrink-0 ${
                                  isSelected
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-blue-50 text-blue-700'
                                }`}
                              >
                                {OPTION_LABELS[optIdx]}
                              </span>
                              <span className="leading-relaxed">{optText}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {errorMsg && (
                <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-300 text-red-700 text-xs sm:text-sm font-medium">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-display font-black text-base shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Send className="w-5 h-5" />
                <span>{isSubmitting ? 'ĐANG CHẤM ĐIỂM & GỬI DỮ LIỆU...' : 'NỘP BÀI & CHẤM ĐIỂM'}</span>
              </button>
            </section>
          </form>
        )}
      </main>

      <div className="fixed bottom-2.5 left-4 z-30 text-[11px] font-medium text-slate-400 pointer-events-none select-none">
        by Phuc Hau HR
      </div>
    </div>
  );
}
