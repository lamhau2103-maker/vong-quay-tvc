import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Award,
  Send,
  ArrowLeft,
  RotateCcw,
  User,
  BookOpen
} from 'lucide-react';
import { AppSettings, StudentSubmission, DEFAULT_QUESTIONS } from './types';

interface ChallengePageProps {
  settings: AppSettings;
  onSubmitSuccess: (submission: StudentSubmission) => void;
  onBackToWheel?: () => void;
  isEmbeddedPreview?: boolean;
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
  onSubmitSuccess,
  onBackToWheel,
  isEmbeddedPreview = false
}: ChallengePageProps) {
  const questions =
    Array.isArray(settings.questions) && settings.questions.length === 10
      ? settings.questions
      : DEFAULT_QUESTIONS;

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [school, setSchool] = useState(settings.schoolName || 'Đại học Nông Lâm TP.HCM');
  const [department, setDepartment] = useState('');
  const [year, setYear] = useState('');
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedResult, setSubmittedResult] = useState<StudentSubmission | null>(null);

  useEffect(() => {
    if (!school && settings.schoolName) {
      setSchool(settings.schoolName);
    }
  }, [settings.schoolName, school]);

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
      if (orderedAnswers[idx] === q.correctIndex) {
        calculatedScore += 1;
      }
    });

    const now = new Date();
    const formattedTime = `${now.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })} - ${now.toLocaleDateString('vi-VN')}`;

    const fallbackSubmission: StudentSubmission = {
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

    try {
      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          phone: cleanedPhone,
          school: trimmedSchool,
          department: trimmedDept,
          year: trimmedYear,
          answers: orderedAnswers
        })
      });

      if (response.ok) {
        const data = await response.json();
        const finalSub: StudentSubmission = data.submission || fallbackSubmission;
        setSubmittedResult(finalSub);
        onSubmitSuccess(finalSub);
      } else {
        setSubmittedResult(fallbackSubmission);
        onSubmitSuccess(fallbackSubmission);
      }
    } catch {
      setSubmittedResult(fallbackSubmission);
      onSubmitSuccess(fallbackSubmission);
    } finally {
      setIsSubmitting(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleResetForm = () => {
    setSubmittedResult(null);
    setName('');
    setPhone('');
    setDepartment('');
    setYear('');
    setAnswers({});
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950 via-slate-950 to-slate-950 text-slate-100 pb-14">
      {/* Header Trang Thử Thách Nhận Quà */}
      <header className="sticky top-0 z-30 border-b border-amber-500/25 bg-slate-950/90 backdrop-blur-md shadow-lg">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-white shadow-md p-1 flex items-center justify-center border border-slate-700/60 shrink-0 overflow-hidden">
              <img
                src="/assets/aistudio/9D442E44-DA18-4359-A1C0-B96CEA80BA07-removebg-preview_388b18da.png"
                alt="Thai Viet Corporation"
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <div className="text-[11px] sm:text-xs font-black tracking-wide uppercase text-amber-400 font-display">
                CÔNG TY CỔ PHẦN THÁI VIỆT CORPORATION
              </div>
              <div className="text-sm sm:text-base font-display font-black text-white">
                THỬ THÁCH NHẬN QUÀ
              </div>
            </div>
          </div>

          {onBackToWheel && (
            <button
              type="button"
              onClick={onBackToWheel}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-200 transition cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-4 h-4 text-amber-400" />
              <span>Về Vòng Quay</span>
            </button>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-6">
        {submittedResult ? (
          /* MÀN HÌNH KẾT QUẢ CHẤM ĐIỂM TỰ ĐỘNG */
          <div className="bg-slate-900/95 border-2 border-amber-400/70 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-300 via-amber-500 to-orange-600 text-slate-950 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/30">
              <Award className="w-9 h-9" />
            </div>

            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                ✓ Đã nộp bài &amp; chấm điểm thành công
              </div>
              <h2 className="font-display font-black text-2xl sm:text-3xl text-white mt-1">
                {submittedResult.name}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                {submittedResult.school} · Khoa <strong className="text-amber-300">{submittedResult.department}</strong> · {submittedResult.year}
              </p>
              <p className="text-xs font-mono tabular-nums text-slate-400 mt-0.5">
                SĐT: {submittedResult.phone}
              </p>
            </div>

            {/* Khung Điểm Số */}
            <div className="py-5 px-6 rounded-2xl bg-slate-950/90 border border-amber-400/40 max-w-md mx-auto">
              <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                Kết quả bài trắc nghiệm của bạn
              </div>
              <div className="font-display font-black text-4xl sm:text-5xl text-amber-400 my-2 tabular-nums">
                {submittedResult.score} / {submittedResult.totalQuestions}
              </div>
              <div className="text-xs font-medium text-slate-300">
                Trả lời đúng <strong className="text-white">{submittedResult.score}</strong> trên tổng số <strong className="text-white">{submittedResult.totalQuestions}</strong> câu hỏi
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-200 text-xs sm:text-sm leading-relaxed">
              Thông tin và điểm số của bạn đã được chuyển tới <strong>Vòng Quay Chiếc Nón Kỳ Diệu</strong> tại gian hàng. Hãy đến khu vực vòng quay để bấm <strong>QUAY NGAY</strong> nhận quà!
            </div>

            {/* Chi tiết đáp án */}
            <div className="text-left space-y-2.5 pt-2 border-t border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Chi tiết kết quả 10 câu hỏi:
              </h3>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {questions.map((q, idx) => {
                  const userAns = submittedResult.answers[idx];
                  const isCorrect = userAns === q.correctIndex;
                  return (
                    <div
                      key={q.id}
                      className={`p-3 rounded-xl border text-xs ${
                        isCorrect
                          ? 'bg-emerald-950/30 border-emerald-500/30 text-slate-200'
                          : 'bg-red-950/30 border-red-500/30 text-slate-200'
                      }`}
                    >
                      <div className="font-semibold text-white">
                        Câu {idx + 1}: {q.question}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
                        <span>
                          Bạn chọn:{' '}
                          <strong className={isCorrect ? 'text-emerald-400' : 'text-red-400'}>
                            {OPTION_LABELS[userAns]}. {q.options[userAns]}
                          </strong>
                        </span>
                        {!isCorrect && (
                          <span className="text-amber-300">
                            Đáp án đúng: <strong>{OPTION_LABELS[q.correctIndex]}. {q.options[q.correctIndex]}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              {onBackToWheel && (
                <button
                  type="button"
                  onClick={onBackToWheel}
                  className="flex-1 py-3.5 px-5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-display font-extrabold text-sm transition cursor-pointer shadow-lg shadow-amber-500/25"
                >
                  Đến Vòng Quay Nhận Quà Ngay
                </button>
              )}
              <button
                type="button"
                onClick={handleResetForm}
                className="inline-flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs sm:text-sm transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Làm lượt mới</span>
              </button>
            </div>
          </div>
        ) : (
          /* BIỂU MẪU NHẬP LIỆU SINH VIÊN + 10 CÂU HỎI TRẮC NGHIỆM */
          <form onSubmit={handleSubmitChallenge} className="space-y-6" noValidate>
            {/* KHỐI 1: THÔNG TIN CÁ NHÂN SINH VIÊN */}
            <section className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-amber-400" />
                  <h2 className="font-display font-bold text-base sm:text-lg text-white">
                    Phần 1: Thông Tin Sinh Viên
                  </h2>
                </div>
                <span className="text-xs font-semibold text-amber-400">Bắt buộc *</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Họ và Tên */}
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                    1. Họ và Tên <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Văn A"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-amber-400 transition"
                  />
                </div>

                {/* 2. Số Điện Thoại */}
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                    2. Số Điện Thoại <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ví dụ: 0901234567"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm font-mono tabular-nums focus:outline-none focus:border-amber-400 transition"
                  />
                </div>

                {/* 3. Tên Trường */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                    3. Tên Trường <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    placeholder="Ví dụ: Đại học Nông Lâm TP.HCM"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-amber-400 transition"
                  />
                </div>

                {/* 4. Khoa Học */}
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                    4. Khoa Học <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    list="challengeDeptSuggestions"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="VD: Chăn nuôi thú y, CNTT..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-amber-400 transition"
                  />
                  <datalist id="challengeDeptSuggestions">
                    {DEPARTMENT_SUGGESTIONS.map((d) => (
                      <option key={d} value={d} />
                    ))}
                  </datalist>
                </div>

                {/* 5. Sinh Viên Năm Thứ */}
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                    5. Sinh Viên Năm Thứ <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-amber-400 transition"
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
            <section className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800 sticky top-[61px] bg-slate-900/95 backdrop-blur-md z-20 py-2 -mx-2 px-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-amber-400" />
                  <h2 className="font-display font-bold text-base sm:text-lg text-white">
                    Phần 2: 10 Câu Hỏi Trắc Nghiệm
                  </h2>
                </div>
                <span className="text-xs font-mono tabular-nums font-semibold text-amber-300">
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
                          ? 'bg-slate-950/90 border-amber-500/40'
                          : 'bg-slate-950/60 border-slate-800'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 mb-3.5">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-400/15 border border-amber-400/40 text-amber-300 font-display font-bold text-xs shrink-0 mt-0.5 tabular-nums">
                          {qIdx + 1}
                        </span>
                        <h3 className="text-sm sm:text-base font-semibold text-white leading-snug">
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
                                  ? 'bg-amber-400/20 border-amber-400 text-white font-semibold shadow-sm'
                                  : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                              }`}
                            >
                              <span
                                className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold shrink-0 ${
                                  isSelected
                                    ? 'bg-amber-400 text-slate-950'
                                    : 'bg-slate-800 text-slate-400'
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
                <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-950/90 border border-red-500/60 text-red-200 text-xs sm:text-sm font-medium">
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-display font-black text-base shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Send className="w-5 h-5" />
                <span>{isSubmitting ? 'ĐANG CHẤM ĐIỂM...' : 'NỘP BÀI & CHẤM ĐIỂM'}</span>
              </button>
            </section>
          </form>
        )}
      </main>
    </div>
  );
}
