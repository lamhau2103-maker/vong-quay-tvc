/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import QRCode from 'qrcode';
import {
  Volume2,
  VolumeX,
  Lock,
  Unlock,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Gift,
  FileSpreadsheet,
  Save,
  RotateCcw,
  Sliders,
  QrCode,
  Copy,
  Check,
  HelpCircle,
  Plus,
  Package,
  FileText,
  Disc
} from 'lucide-react';
import {
  AppSettings,
  PrizeItem,
  StudentSubmission,
  WinnerRecord,
  DEFAULT_SETTINGS,
  DEFAULT_PRIZE_ITEMS,
  DEFAULT_QUESTIONS
} from './types';
import ChallengePage from './ChallengePage';

interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  vRot: number;
  alpha: number;
}

const STORAGE_KEY_SETTINGS = 'CNKD_CAREER_FAIR_SETTINGS_V3';
const STORAGE_KEY_SUBMISSIONS = 'CNKD_CAREER_FAIR_SUBMISSIONS_V3';
const STORAGE_KEY_HISTORY = 'CNKD_CAREER_FAIR_HISTORY_V3';

// Bảng màu rực rỡ phong cách Game Show "Chiếc Nón Kỳ Diệu"
const WHEEL_PALETTE = [
  { bg: '#DC2626', bgInner: '#991B1B', text: '#FFFFFF', border: '#FEF08A' }, // Đỏ Ruby
  { bg: '#F59E0B', bgInner: '#B45309', text: '#0F172A', border: '#FEF08A' }, // Vàng Hoàng Kim
  { bg: '#059669', bgInner: '#065F46', text: '#FFFFFF', border: '#FEF08A' }, // Xanh Ngọc Bích
  { bg: '#2563EB', bgInner: '#1E40AF', text: '#FFFFFF', border: '#FEF08A' }, // Xanh Sapphire
  { bg: '#7C3AED', bgInner: '#5B21B6', text: '#FFFFFF', border: '#FEF08A' }, // Tím Hoàng Gia
  { bg: '#EA580C', bgInner: '#9A3412', text: '#FFFFFF', border: '#FEF08A' }, // Cam Lửa
  { bg: '#0D9488', bgInner: '#115E59', text: '#FFFFFF', border: '#FEF08A' }, // Xanh Lam Ngọc
  { bg: '#DB2777', bgInner: '#9D174D', text: '#FFFFFF', border: '#FEF08A' }  // Hồng Ngọc
];

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

// Hàm chuẩn hóa chuỗi tiếng Việt (bỏ dấu, chữ thường) để so khớp tên Khoa chính xác
function normalizeVietnamese(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export default function App() {
  // Kiểm tra tham số URL (?mode=challenge) khi trang web được tải
  const [isChallengeView, setIsChallengeView] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('mode') === 'challenge';
  });

  // Tab công cụ trên giao diện chính: 'wheel' (Vòng quay) | 'admin' (Admin)
  const [activeMainTab, setActiveMainTab] = useState<'wheel' | 'admin'>('wheel');

  // Lắng nghe sự kiện popstate khi người dùng nhấn Back/Forward trình duyệt
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setIsChallengeView(params.get('mode') === 'challenge');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // --- STATE CẤU HÌNH ADMIN ---
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          prizeItems:
            Array.isArray(parsed.prizeItems) && parsed.prizeItems.length > 0
              ? parsed.prizeItems
              : DEFAULT_PRIZE_ITEMS,
          questions:
            Array.isArray(parsed.questions) && parsed.questions.length === 10
              ? parsed.questions
              : DEFAULT_QUESTIONS
        };
      }
    } catch {
      // Fallback
    }
    return DEFAULT_SETTINGS;
  });

  // --- STATE NHẬP THÊM QUÀ MỚI TRONG ADMIN ---
  const [newPrizeName, setNewPrizeName] = useState('');
  const [newPrizeQty, setNewPrizeQty] = useState<number>(10);

  // --- STATE DANH SÁCH SINH VIÊN ĐÃ NỘP BÀI THỬ THÁCH QUA QR ---
  const [submissions, setSubmissions] = useState<StudentSubmission[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SUBMISSIONS);
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return [];
  });

  // --- STATE LỊCH SỬ TRÚNG QUÀ ---
  const [history, setHistory] = useState<WinnerRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_HISTORY);
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return [];
  });

  // Sinh viên đang được chọn để quay vòng quay
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [spinWarning, setSpinWarning] = useState<string | null>(null);

  // --- STATE MÃ QR CODE ---
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);

  // --- STATE BẢO MẬT ADMIN ---
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [activeQuestionTab, setActiveQuestionTab] = useState<number>(0);

  // --- STATE VÒNG QUAY & HIỆU ỨNG ---
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isSpinning, setIsSpinning] = useState(false);
  const [pointerBounceAngle, setPointerBounceAngle] = useState(0);
  const [winnerModalData, setWinnerModalData] = useState<WinnerRecord | null>(null);

  // Refs cho Canvas, Góc quay và Web Audio API
  const wheelCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const confettiCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentRotationRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Đường dẫn URL dẫn thẳng đến window.location.origin + window.location.pathname + '?mode=challenge'
  const challengeUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return window.location.origin + window.location.pathname + '?mode=challenge';
  }, []);

  // Tạo ảnh QR Code sắc nét kích thước lớn dẫn thẳng đến challengeUrl
  useEffect(() => {
    if (!challengeUrl) return;
    QRCode.toDataURL(challengeUrl, {
      width: 480,
      margin: 2,
      color: {
        dark: '#0F172A',
        light: '#FFFFFF'
      }
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => {});
  }, [challengeUrl]);

  // Kết nối Server API & Server-Sent Events (SSE) để đồng bộ thời gian thực
  useEffect(() => {
    let isMounted = true;

    fetch('/api/state')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted || !data) return;
        if (data.settings) {
          setSettings((prev) => ({
            ...prev,
            ...data.settings,
            prizeItems:
              Array.isArray(data.settings.prizeItems) &&
              data.settings.prizeItems.length > 0
                ? data.settings.prizeItems
                : prev.prizeItems,
            questions:
              Array.isArray(data.settings.questions) &&
              data.settings.questions.length === 10
                ? data.settings.questions
                : prev.questions
          }));
        }
        if (Array.isArray(data.submissions)) {
          setSubmissions(data.submissions);
        }
        if (Array.isArray(data.history)) {
          setHistory(data.history);
        }
      })
      .catch(() => {});

    const eventSource = new EventSource('/api/stream');
    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed?.state && isMounted) {
          if (parsed.state.settings) {
            setSettings((prev) => ({
              ...prev,
              ...parsed.state.settings,
              prizeItems:
                Array.isArray(parsed.state.settings.prizeItems) &&
                parsed.state.settings.prizeItems.length > 0
                  ? parsed.state.settings.prizeItems
                  : prev.prizeItems,
              questions:
                Array.isArray(parsed.state.settings.questions) &&
                parsed.state.settings.questions.length === 10
                  ? parsed.state.settings.questions
                  : prev.questions
            }));
          }
          if (Array.isArray(parsed.state.submissions)) {
            setSubmissions(parsed.state.submissions);
          }
          if (Array.isArray(parsed.state.history)) {
            setHistory(parsed.state.history);
          }
        }
      } catch {
        // Ignore malformed SSE payload
      }
    };

    return () => {
      isMounted = false;
      eventSource.close();
    };
  }, []);

  // Lưu dự phòng vào LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    } catch {}
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify(submissions));
    } catch {}
  }, [submissions]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
    } catch {}
  }, [history]);

  // Danh sách sinh viên đã nộp bài và đang chờ quay thưởng
  const pendingSubmissions = useMemo(
    () => submissions.filter((s) => !s.hasSpun),
    [submissions]
  );

  // Tự động chọn sinh viên mới nhất vừa hoàn thành bài trắc nghiệm
  useEffect(() => {
    if (pendingSubmissions.length > 0) {
      const stillPending = pendingSubmissions.some((s) => s.id === selectedSubmissionId);
      if (!stillPending) {
        setSelectedSubmissionId(pendingSubmissions[0].id);
        setSpinWarning(null);
      }
    } else if (submissions.length > 0 && !selectedSubmissionId) {
      setSelectedSubmissionId(submissions[0].id);
    }
  }, [pendingSubmissions, submissions, selectedSubmissionId]);

  // Bài nộp đang được hiển thị/chọn ngay dưới vòng quay
  const activeSubmission = useMemo(() => {
    if (!selectedSubmissionId) {
      return pendingSubmissions[0] || submissions[0] || null;
    }
    return (
      submissions.find((s) => s.id === selectedSubmissionId) ||
      pendingSubmissions[0] ||
      submissions[0] ||
      null
    );
  }, [submissions, pendingSubmissions, selectedSubmissionId]);

  // Danh sách các phần quà ĐANG CÒN SỐ LƯỢNG > 0 (Khi về 0 sẽ tự động ẩn khỏi vòng quay)
  const availablePrizes = useMemo(
    () =>
      (settings.prizeItems || []).filter(
        (item) => item.name.trim().length > 0 && Number(item.quantity) > 0
      ),
    [settings.prizeItems]
  );

  // Tổng số lượng quà còn lại
  const totalRemainingQty = useMemo(
    () => availablePrizes.reduce((sum, item) => sum + Number(item.quantity), 0),
    [availablePrizes]
  );

  // Đảm bảo tên phần quà mục tiêu trong Admin luôn nằm trong danh sách prizeItems
  useEffect(() => {
    const allPrizeNames = (settings.prizeItems || []).map((p) => p.name);
    if (allPrizeNames.length === 0) return;

    setSettings((prev) => {
      let changed = false;
      const next = { ...prev };
      if (!allPrizeNames.includes(prev.allDeptOver7TargetPrize)) {
        next.allDeptOver7TargetPrize = allPrizeNames[0];
        changed = true;
      }
      if (!allPrizeNames.includes(prev.vetDeptOver8TargetPrize)) {
        next.vetDeptOver8TargetPrize =
          allPrizeNames[Math.min(1, allPrizeNames.length - 1)];
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [settings.prizeItems]);

  // --- WEB AUDIO API: ÂM THANH "TẠCH TẠCH" & CHIẾN THẮNG ---
  const getAudioContext = useCallback((): AudioContext | null => {
    if (typeof window === 'undefined') return null;
    if (!audioCtxRef.current) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        audioCtxRef.current = new AudioContextClass();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  }, []);

  const playPegTickSound = useCallback(() => {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1250, now);
    osc.frequency.exponentialRampToValueAtTime(240, now + 0.038);

    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.038);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.042);
  }, [soundEnabled, getAudioContext]);

  const playVictoryFanfare = useCallback(() => {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
    const startOffsets = [0, 0.11, 0.22, 0.34, 0.5, 0.64];
    const durations = [0.1, 0.1, 0.1, 0.14, 0.12, 0.5];

    notes.forEach((freq, idx) => {
      const startTime = ctx.currentTime + startOffsets[idx];
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.28, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + durations[idx]);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + durations[idx] + 0.03);
    });
  }, [soundEnabled, getAudioContext]);

  // --- HIỆU ỨNG PHÁO HOA GIẤY (CONFETTI CANVAS) ---
  const triggerConfetti = useCallback(() => {
    const canvas = confettiCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#FACC15', '#EF4444', '#10B981', '#3B82F6', '#EC4899', '#F97316', '#A855F7'];
    const particles: ConfettiParticle[] = [];

    for (let i = 0; i < 150; i++) {
      particles.push({
        x: canvas.width * 0.5,
        y: canvas.height * 0.45,
        vx: (Math.random() - 0.5) * 20,
        vy: (Math.random() - 0.85) * 20,
        size: 7 + Math.random() * 7,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 14,
        alpha: 1
      });
    }

    const animateConfetti = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.36;
        p.vx *= 0.99;
        p.rotation += p.vRot;
        p.alpha -= 0.0075;

        if (p.alpha <= 0 || p.y > canvas.height + 50) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }

      if (particles.length > 0) {
        requestAnimationFrame(animateConfetti);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    requestAnimationFrame(animateConfetti);
  }, []);

  // --- VẼ VÒNG QUAY "CHIẾC NÓN KỲ DIỆU" TRÊN HTML5 CANVAS ---
  const drawWheel = useCallback(
    (rotationRad: number) => {
      const canvas = wheelCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const size = 720;
      if (canvas.width !== size || canvas.height !== size) {
        canvas.width = size;
        canvas.height = size;
      }

      const cx = size / 2;
      const cy = size / 2;
      const outerRimRadius = size / 2 - 10;
      const wheelRadius = outerRimRadius - 24;

      const activeList =
        availablePrizes.length > 0
          ? availablePrizes
          : [{ id: 'empty', name: 'Đã hết quà tặng', quantity: 0 }];

      const count = activeList.length;
      const sliceAngle = (Math.PI * 2) / count;

      ctx.clearRect(0, 0, size, size);

      // 1. Vẽ vành ngoài Hoàng Kim
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, outerRimRadius, 0, Math.PI * 2);
      const rimGradient = ctx.createLinearGradient(0, 0, size, size);
      rimGradient.addColorStop(0, '#FEF08A');
      rimGradient.addColorStop(0.35, '#F59E0B');
      rimGradient.addColorStop(0.7, '#B45309');
      rimGradient.addColorStop(1, '#FDE047');
      ctx.fillStyle = rimGradient;
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#F59E0B';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, wheelRadius + 18, 0, Math.PI * 2);
      ctx.fillStyle = '#0F172A';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#F59E0B';
      ctx.stroke();
      ctx.restore();

      // 2. Vẽ các ô quạt phần thưởng đang còn số lượng > 0
      for (let i = 0; i < count; i++) {
        const startAngle = rotationRad + i * sliceAngle;
        const endAngle = startAngle + sliceAngle;
        const colorItem = WHEEL_PALETTE[i % WHEEL_PALETTE.length];

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, wheelRadius, startAngle, endAngle);
        ctx.closePath();

        const segGrad = ctx.createRadialGradient(cx, cy, 40, cx, cy, wheelRadius);
        segGrad.addColorStop(0, colorItem.bgInner);
        segGrad.addColorStop(0.65, colorItem.bg);
        segGrad.addColorStop(1, colorItem.bg);

        ctx.fillStyle = segGrad;
        ctx.fill();

        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#FEF08A';
        ctx.stroke();

        ctx.translate(cx, cy);
        ctx.rotate(startAngle + sliceAngle / 2);
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        const fontSize = count > 14 ? 14 : count > 10 ? 16 : count > 7 ? 18 : 20;
        ctx.font = `800 ${fontSize}px "Be Vietnam Pro", system-ui, sans-serif`;

        const item = activeList[i];
        const rawLabel = item.name;
        const maxChars = count > 12 ? 22 : 26;
        const displayLabel =
          rawLabel.length > maxChars ? `${rawLabel.slice(0, maxChars - 1)}…` : rawLabel;

        ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        ctx.fillStyle = colorItem.text;
        ctx.fillText(displayLabel, wheelRadius - 22, 0);

        ctx.restore();
      }

      // 3. Vẽ các đinh chốt (Pegs)
      const totalPegs = Math.max(count * 2, 16);
      for (let i = 0; i < totalPegs; i++) {
        const pegAngle = rotationRad + (i * Math.PI * 2) / totalPegs;
        const px = cx + Math.cos(pegAngle) * (wheelRadius + 9);
        const py = cy + Math.sin(pegAngle) * (wheelRadius + 9);

        ctx.save();
        ctx.beginPath();
        ctx.arc(px, py, 5.5, 0, Math.PI * 2);
        ctx.fillStyle = i % 2 === 0 ? '#FDE047' : '#FFFFFF';
        ctx.shadowColor = '#F59E0B';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#78350F';
        ctx.stroke();
        ctx.restore();
      }

      // 4. Vòng tròn tâm nón
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, 74, 0, Math.PI * 2);
      ctx.fillStyle = '#0F172A';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#FACC15';
      ctx.stroke();
      ctx.restore();
    },
    [availablePrizes]
  );

  useEffect(() => {
    if (!isChallengeView) {
      drawWheel(currentRotationRef.current);
    }
  }, [drawWheel, isChallengeView, activeMainTab]);

  // Kiểm tra sinh viên có thuộc Khoa Chăn nuôi, Thú y không
  const checkIsVetDepartment = useCallback(
    (deptInput: string): boolean => {
      const normStudentDept = normalizeVietnamese(deptInput);
      if (!normStudentDept) return false;

      const keywords = (settings.vetDeptKeywords || 'Chăn nuôi, Thú y')
        .split(',')
        .map((k) => normalizeVietnamese(k))
        .filter(Boolean);

      return keywords.some(
        (kw) => normStudentDept.includes(kw) || kw.includes(normStudentDept)
      );
    },
    [settings.vetDeptKeywords]
  );

  // --- THUẬT TOÁN CHỌN QUÀ THEO CẤU HÌNH CỦA ADMIN ---
  const chooseWinningPrizeIndex = useCallback(
    (student: StudentSubmission): { index: number; appliedRule: string } => {
      const findAvailableIndicesByName = (prizeName: string): number[] => {
        const normTarget = normalizeVietnamese(prizeName);
        if (!normTarget) return [];
        const indices: number[] = [];
        availablePrizes.forEach((p, idx) => {
          if (normalizeVietnamese(p.name) === normTarget) {
            indices.push(idx);
          }
        });
        return indices;
      };

      const isVetDept = checkIsVetDepartment(student.department);
      const isScoreOver8 = student.score > 8;
      const isScoreOver7 = student.score > 7;

      // 1. Kiểm tra điều kiện: Khoa Chăn nuôi, Thú y VÀ Điểm > 8
      if (isVetDept && isScoreOver8) {
        const rateVet = Math.max(0, Math.min(100, Number(settings.vetDeptOver8Rate) || 0));
        const vetTargetIndices = findAvailableIndicesByName(settings.vetDeptOver8TargetPrize);
        if (rateVet > 0 && vetTargetIndices.length > 0) {
          if (Math.random() * 100 < rateVet) {
            const chosen =
              vetTargetIndices[Math.floor(Math.random() * vetTargetIndices.length)];
            return {
              index: chosen,
              appliedRule: 'Khoa Chăn nuôi, Thú y & Điểm > 8'
            };
          }
        }
      }

      // 2. Kiểm tra điều kiện: Tất cả các Khoa học VÀ Điểm > 7
      if (isScoreOver7) {
        const rateAllOver7 = Math.max(
          0,
          Math.min(100, Number(settings.allDeptOver7Rate) || 0)
        );
        const allOver7Indices = findAvailableIndicesByName(
          settings.allDeptOver7TargetPrize
        );
        if (rateAllOver7 > 0 && allOver7Indices.length > 0) {
          if (Math.random() * 100 < rateAllOver7) {
            const chosen =
              allOver7Indices[Math.floor(Math.random() * allOver7Indices.length)];
            return {
              index: chosen,
              appliedRule: 'Tất cả Khoa học & Điểm > 7'
            };
          }
        }
      }

      // 3. Tất cả phần quà còn lại sẽ ngẫu nhiên không cần tham chiếu số điểm và Khoa học
      const normPrize1 = normalizeVietnamese(settings.allDeptOver7TargetPrize);
      const normPrize2 = normalizeVietnamese(settings.vetDeptOver8TargetPrize);

      const remainingGeneralIndices: number[] = [];
      availablePrizes.forEach((p, idx) => {
        const normName = normalizeVietnamese(p.name);
        if (normName !== normPrize1 && normName !== normPrize2) {
          remainingGeneralIndices.push(idx);
        }
      });

      if (remainingGeneralIndices.length > 0) {
        const chosen =
          remainingGeneralIndices[
            Math.floor(Math.random() * remainingGeneralIndices.length)
          ];
        return {
          index: chosen,
          appliedRule: 'Ngẫu nhiên phần quà còn lại'
        };
      }

      const fallbackIdx = Math.floor(Math.random() * availablePrizes.length);
      return {
        index: fallbackIdx,
        appliedRule: 'Ngẫu nhiên phần quà còn lại'
      };
    },
    [
      availablePrizes,
      checkIsVetDepartment,
      settings.allDeptOver7Rate,
      settings.allDeptOver7TargetPrize,
      settings.vetDeptOver8Rate,
      settings.vetDeptOver8TargetPrize
    ]
  );

  // --- XỬ LÝ QUAY VÒNG QUAY ---
  const handleSpinWheel = () => {
    if (isSpinning) return;
    getAudioContext();

    if (availablePrizes.length === 0) {
      setSpinWarning(
        'Tất cả phần quà trên vòng quay đã hết (Số lượng = 0)! Vui lòng bổ sung thêm số lượng quà trong phần Admin.'
      );
      return;
    }

    if (!activeSubmission) {
      setSpinWarning(
        'Chưa có bài nộp nào! Vui lòng quét mã QR để hoàn thành Thử Thách Nhận Quà trước khi bấm quay.'
      );
      return;
    }

    if (activeSubmission.hasSpun) {
      setSpinWarning(
        `Sinh viên ${activeSubmission.name} đã thực hiện lượt quay rồi! Vui lòng chọn bài nộp của sinh viên tiếp theo.`
      );
      return;
    }

    setSpinWarning(null);
    setIsSpinning(true);

    const snapshotAvailable = [...availablePrizes];
    const count = snapshotAvailable.length;
    const sliceAngle = (Math.PI * 2) / count;
    const { index: winningIndex, appliedRule } =
      chooseWinningPrizeIndex(activeSubmission);

    const wonPrizeItem = snapshotAvailable[winningIndex];

    const pointerAngleRad = (3 * Math.PI) / 2;
    const safeSliceOffset = (0.22 + Math.random() * 0.56) * sliceAngle;
    const desiredFinalMod =
      (pointerAngleRad - (winningIndex * sliceAngle + safeSliceOffset) + Math.PI * 4) %
      (Math.PI * 2);

    const startRotation = currentRotationRef.current;
    const currentMod =
      ((startRotation % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

    let angleDelta = desiredFinalMod - currentMod;
    if (angleDelta < 0) {
      angleDelta += Math.PI * 2;
    }

    const fullSpins = (7 + Math.floor(Math.random() * 3)) * Math.PI * 2;
    const targetRotation = startRotation + fullSpins + angleDelta;

    const spinDurationMs = 5600;
    const startTime = performance.now();
    const totalPegs = Math.max(count * 2, 16);
    const pegStepAngle = (Math.PI * 2) / totalPegs;
    let lastPegIndex = Math.floor(startRotation / pegStepAngle);

    const spinningStudent = activeSubmission;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / spinDurationMs, 1);

      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const nextRotation =
        startRotation + (targetRotation - startRotation) * easeOutQuart;

      currentRotationRef.current = nextRotation;
      drawWheel(nextRotation);

      const currentPegIndex = Math.floor(nextRotation / pegStepAngle);
      if (currentPegIndex !== lastPegIndex) {
        lastPegIndex = currentPegIndex;
        playPegTickSound();
        setPointerBounceAngle(-20);
        window.setTimeout(() => {
          setPointerBounceAngle(0);
        }, 55);
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsSpinning(false);
        setPointerBounceAngle(0);

        const nowDate = new Date();
        const formattedTime = `${nowDate.toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })} - ${nowDate.toLocaleDateString('vi-VN')}`;

        const newRecord: WinnerRecord = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          submissionId: spinningStudent.id,
          name: spinningStudent.name,
          phone: spinningStudent.phone,
          school: spinningStudent.school,
          department: spinningStudent.department,
          year: spinningStudent.year,
          score: spinningStudent.score,
          prize: wonPrizeItem.name,
          timestamp: formattedTime,
          appliedRule
        };

        // Tự động giảm số lượng phần quà trúng đi 1
        setSettings((prev) => ({
          ...prev,
          prizeItems: prev.prizeItems.map((item) =>
            item.id === wonPrizeItem.id
              ? { ...item, quantity: Math.max(0, Number(item.quantity) - 1) }
              : item
          )
        }));

        // Đánh dấu bài nộp của sinh viên đã quay xong
        setSubmissions((prev) =>
          prev.map((s) =>
            s.id === spinningStudent.id
              ? { ...s, hasSpun: true, wonPrize: wonPrizeItem.name }
              : s
          )
        );

        setHistory((prev) => [newRecord, ...prev]);
        setWinnerModalData(newRecord);
        playVictoryFanfare();
        triggerConfetti();

        fetch('/api/spin-complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            submissionId: spinningStudent.id,
            prizeId: wonPrizeItem.id,
            winnerRecord: newRecord
          })
        }).catch(() => {});
      }
    };

    requestAnimationFrame(animate);
  };

  // --- QUẢN LÝ DANH SÁCH QUÀ TẶNG KÈM SỐ LƯỢNG TRONG ADMIN ---
  const handleAddPrizeItem = () => {
    const trimmed = newPrizeName.trim();
    if (!trimmed) return;
    const qty = Math.max(0, Number(newPrizeQty) || 0);

    const newItem: PrizeItem = {
      id: `prize-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: trimmed,
      quantity: qty
    };

    setSettings((prev) => ({
      ...prev,
      prizeItems: [...prev.prizeItems, newItem]
    }));
    setNewPrizeName('');
    setNewPrizeQty(10);
  };

  const handleUpdatePrizeName = (id: string, name: string) => {
    setSettings((prev) => ({
      ...prev,
      prizeItems: prev.prizeItems.map((item) =>
        item.id === id ? { ...item, name } : item
      )
    }));
  };

  const handleUpdatePrizeQuantity = (id: string, quantity: number) => {
    const safeQty = Math.max(0, Math.floor(Number(quantity) || 0));
    setSettings((prev) => ({
      ...prev,
      prizeItems: prev.prizeItems.map((item) =>
        item.id === id ? { ...item, quantity: safeQty } : item
      )
    }));
  };

  const handleRemovePrizeItem = (id: string) => {
    setSettings((prev) => ({
      ...prev,
      prizeItems: prev.prizeItems.filter((item) => item.id !== id)
    }));
  };

  // --- XỬ LÝ ĐĂNG NHẬP ADMIN (Tài khoản: Admin, Mật khẩu: admintvc) ---
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUser = loginUsername.trim();
    if (
      (trimmedUser === 'Admin' || trimmedUser.toLowerCase() === 'admin') &&
      loginPassword === 'admintvc'
    ) {
      setIsAdminUnlocked(true);
      setLoginError(null);
      setLoginPassword('');
    } else {
      setLoginError('Sai tài khoản hoặc mật khẩu! (Tài khoản: Admin / Mật khẩu: admintvc)');
    }
  };

  const handleLockAdmin = () => {
    setIsAdminUnlocked(false);
    setLoginUsername('');
    setLoginPassword('');
    setLoginError(null);
  };

  const handleSaveSettings = async () => {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      }).catch(() => {});
      setSaveSuccessMessage('Đã lưu toàn bộ cài đặt, số lượng quà & 10 câu hỏi thành công!');
      window.setTimeout(() => {
        setSaveSuccessMessage(null);
      }, 3200);
    } catch {
      setSaveSuccessMessage('Đã lưu cài đặt trên thiết bị!');
    }
  };

  const handleResetDefaultSettings = async () => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(DEFAULT_SETTINGS)
    }).catch(() => {});
    setSaveSuccessMessage('Đã khôi phục danh sách quà và 10 câu hỏi mẫu mặc định!');
    window.setTimeout(() => {
      setSaveSuccessMessage(null);
    }, 3000);
  };

  // Cập nhật câu hỏi trắc nghiệm thứ idx trong Admin
  const handleUpdateQuestionText = (qIdx: number, text: string) => {
    setSettings((prev) => {
      const nextQuestions = [...prev.questions];
      nextQuestions[qIdx] = {
        ...nextQuestions[qIdx],
        question: text
      };
      return { ...prev, questions: nextQuestions };
    });
  };

  const handleUpdateOptionText = (qIdx: number, optIdx: number, text: string) => {
    setSettings((prev) => {
      const nextQuestions = [...prev.questions];
      const nextOptions = [...nextQuestions[qIdx].options] as [
        string,
        string,
        string,
        string
      ];
      nextOptions[optIdx] = text;
      nextQuestions[qIdx] = {
        ...nextQuestions[qIdx],
        options: nextOptions
      };
      return { ...prev, questions: nextQuestions };
    });
  };

  const handleUpdateCorrectOption = (qIdx: number, correctIndex: number) => {
    setSettings((prev) => {
      const nextQuestions = [...prev.questions];
      nextQuestions[qIdx] = {
        ...nextQuestions[qIdx],
        correctIndex
      };
      return { ...prev, questions: nextQuestions };
    });
  };

  // Xuất file Excel/CSV
  const handleExportCSV = () => {
    if (history.length === 0) return;

    const headers = [
      'STT',
      'Họ và Tên Sinh Viên',
      'Số Điện Thoại',
      'Tên Trường',
      'Khoa Học',
      'Năm Học',
      'Điểm Trắc Nghiệm (/10)',
      'Phần Quà Trúng Thưởng',
      'Thời Gian Quay'
    ];

    const rows = history.map((item, idx) => [
      idx + 1,
      `"${(item.name || '').replace(/"/g, '""')}"`,
      `"=""${item.phone || ''}"""`,
      `"${(item.school || settings.schoolName || '').replace(/"/g, '""')}"`,
      `"${(item.department || '').replace(/"/g, '""')}"`,
      `"${(item.year || '').replace(/"/g, '""')}"`,
      `"${item.score ?? 0}/10"`,
      `"${(item.prize || '').replace(/"/g, '""')}"`,
      `"${item.timestamp || ''}"`
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const cleanSchoolSlug =
      normalizeVietnamese(settings.schoolName).replace(/\s+/g, '_') || 'truong_dh';
    link.download = `Danh_Sach_Sinh_Vien_Ngay_Hoi_Viec_Lam_${cleanSchoolSlug}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleClearHistory = () => {
    setHistory([]);
    fetch('/api/clear-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clearSubmissions: false })
    }).catch(() => {});
  };

  const handleCopyChallengeLink = async () => {
    if (!challengeUrl) return;
    try {
      await navigator.clipboard.writeText(challengeUrl);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2500);
    } catch {}
  };

  // Nếu URL có ?mode=challenge (sinh viên quét QR trên điện thoại):
  // Tự động ẩn toàn bộ giao diện Vòng quay may mắn / Banner chính, chỉ hiển thị form nhập thông tin sinh viên và 10 câu hỏi trắc nghiệm kèm nút nộp bài.
  if (isChallengeView) {
    return (
      <ChallengePage
        settings={settings}
        onSubmitSuccess={(newSub) => {
          setSubmissions((prev) => {
            const exists = prev.some((s) => s.id === newSub.id);
            return exists ? prev : [newSub, ...prev];
          });
          setSelectedSubmissionId(newSub.id);
        }}
      />
    );
  }

  const displaySchoolName =
    settings.schoolName.trim().length > 0
      ? settings.schoolName.trim().toUpperCase()
      : 'ĐẠI HỌC NÔNG LÂM TP.HCM';

  const currentEditingQuestion =
    settings.questions[activeQuestionTab] || DEFAULT_QUESTIONS[0];

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      {/* Canvas Pháo Hoa Confetti */}
      <canvas
        ref={confettiCanvasRef}
        className="fixed inset-0 pointer-events-none z-50 w-full h-full"
      />

      {/* 1. HEADER (PHÍA TRÊN CÙNG) */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-xs">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-3.5 flex flex-col xl:flex-row items-center justify-between gap-3">
          {/* Brand Lockup: Logo Thai Viet Corporation */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="h-12 w-12 rounded-xl bg-white shadow-xs p-1 flex items-center justify-center border border-slate-200 shrink-0 overflow-hidden">
              <img
                src="/assets/aistudio/9D442E44-DA18-4359-A1C0-B96CEA80BA07-removebg-preview_388b18da.png"
                alt="Thai Viet Corporation"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="text-left">
              <div className="text-xs sm:text-sm font-black tracking-wide uppercase text-red-600 font-display">
                CÔNG TY CỔ PHẦN THÁI VIỆT CORPORATION
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                Bộ phận Tuyển dụng &amp; Kết nối Sinh viên
              </div>
            </div>
          </div>

          {/* Tiêu đề chính căn giữa, màu chữ xanh dương, tự động cập nhật theo thời gian thực */}
          <h1 className="font-display font-black text-lg sm:text-2xl lg:text-[24px] text-center tracking-tight leading-snug text-blue-700 max-w-3xl">
            NGÀY HỘI VIỆC LÀM CÙNG TRƯỜNG {displaySchoolName}
          </h1>
        </div>
      </header>

      {/* 2. THÂN CHƯƠNG TRÌNH CHIA THEO 2 TAB CÔNG CỤ: VÒNG QUAY & ADMIN */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-5 pb-24 bg-white">
        {/* ================= TAB 1: VÒNG QUAY (CĂN TRÊN NGANG KHUNG HÌNH QR CODE) ================= */}
        <div className={activeMainTab === 'wheel' ? 'block' : 'hidden'}>
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            {/* CỘT TRÁI (60%): VÒNG QUAY ĐẶT NGANG HÀNG TRÊN CÙNG VỚI KHUNG HÌNH QR CODE + THÔNG TIN BÀI NỘP & SỐ ĐIỂM PHÍA DƯỚI */}
            <section className="w-full lg:w-[60%] bg-white border border-blue-100 rounded-2xl p-5 sm:p-6 flex flex-col items-center justify-start shadow-sm relative overflow-hidden">
              {spinWarning && (
                <div className="w-full mb-3 px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-red-700 font-medium">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{spinWarning}</span>
                </div>
              )}

              {/* Khu vực Vòng Quay Canvas - Căn sát lên trên ngang với khung QR Code */}
              <div className="relative flex items-center justify-center mt-1 w-full max-w-[500px] aspect-square">
                {/* Kim chỉ định vị trí trúng thưởng ở đỉnh 12h */}
                <div
                  className="absolute -top-3.5 left-1/2 z-20 pointer-events-none transition-transform duration-75"
                  style={{
                    transform: `translateX(-50%) rotate(${pointerBounceAngle}deg)`,
                    transformOrigin: '50% 12px'
                  }}
                >
                  <svg
                    width="56"
                    height="68"
                    viewBox="0 0 58 70"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="drop-shadow-md"
                  >
                    <path
                      d="M29 67L8 19C4.8 11 10.8 2 19.5 2H38.5C47.2 2 53.2 11 50 19L29 67Z"
                      fill="url(#pointerGoldRed)"
                      stroke="#FEF08A"
                      strokeWidth="3"
                    />
                    <circle
                      cx="29"
                      cy="18"
                      r="7.5"
                      fill="#7F1D1D"
                      stroke="#FDE047"
                      strokeWidth="2.5"
                    />
                    <defs>
                      <linearGradient
                        id="pointerGoldRed"
                        x1="29"
                        y1="2"
                        x2="29"
                        y2="67"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop stopColor="#FEF08A" />
                        <stop offset="0.45" stopColor="#F59E0B" />
                        <stop offset="1" stopColor="#DC2626" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>

                {/* HTML5 Canvas Vòng Quay Chiếc Nón Kỳ Diệu */}
                <canvas
                  ref={wheelCanvasRef}
                  width={720}
                  height={720}
                  className="w-full h-full rounded-full shadow-lg"
                />

                {/* Nút "QUAY NGAY" ở chính giữa vòng quay */}
                <button
                  type="button"
                  onClick={handleSpinWheel}
                  disabled={isSpinning}
                  className={`absolute z-20 w-28 h-28 sm:w-32 sm:h-32 rounded-full p-1.5 bg-gradient-to-b from-blue-200 via-blue-500 to-blue-700 shadow-lg transition-transform focus:outline-none ${
                    isSpinning
                      ? 'scale-95 opacity-90 cursor-wait'
                      : 'hover:scale-105 active:scale-95 cursor-pointer'
                  }`}
                  aria-label="Quay ngay"
                >
                  <div className="w-full h-full rounded-full bg-gradient-to-b from-red-600 via-red-700 to-red-900 border-2 border-blue-100 flex flex-col items-center justify-center text-center px-2 shadow-inner">
                    <span className="font-display font-black text-white text-sm sm:text-base leading-tight tracking-wider drop-shadow">
                      {isSpinning ? 'ĐANG\nQUAY...' : 'QUAY\nNGAY'}
                    </span>
                  </div>
                </button>
              </div>

              {/* NGAY PHÍA DƯỚI VÒNG QUAY: HIỂN THỊ THÔNG TIN BÀI NỘP VÀ SỐ ĐIỂM */}
              <div className="w-full mt-5 pt-4 border-t border-slate-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <h3 className="font-display font-bold text-sm sm:text-base text-blue-900 uppercase tracking-wide">
                      Thông Tin Bài Nộp &amp; Số Điểm
                    </h3>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono tabular-nums text-slate-600">
                    <span>
                      Lượt đã quay: <strong className="text-blue-600">{history.length}</strong>
                    </span>
                    <span>·</span>
                    <span>
                      Ô quà còn lại:{' '}
                      <strong className="text-emerald-600">
                        {availablePrizes.length} ô ({totalRemainingQty} phần quà)
                      </strong>
                    </span>
                  </div>
                </div>

                {activeSubmission ? (
                  <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/40 border border-blue-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display font-black text-base sm:text-lg text-slate-900">
                          {activeSubmission.name}
                        </span>
                        <span className="text-slate-400">·</span>
                        <span className="text-xs sm:text-sm font-mono tabular-nums text-blue-700 font-semibold">
                          SĐT: {activeSubmission.phone}
                        </span>
                        <span className="text-slate-400">·</span>
                        <span
                          className={`text-xs font-semibold ${
                            activeSubmission.hasSpun ? 'text-slate-500' : 'text-emerald-600'
                          }`}
                        >
                          {activeSubmission.hasSpun
                            ? `Đã quay (${activeSubmission.wonPrize || 'Đã nhận quà'})`
                            : '✓ Sẵn sàng quay thưởng'}
                        </span>
                      </div>

                      <div className="text-xs sm:text-sm text-slate-700 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span>
                          Trường: <strong className="text-slate-900">{activeSubmission.school}</strong>
                        </span>
                        <span className="text-slate-400">·</span>
                        <span>
                          Khoa: <strong className="text-blue-700">{activeSubmission.department}</strong>
                        </span>
                        <span className="text-slate-400">·</span>
                        <span>
                          Năm học: <strong className="text-slate-900">{activeSubmission.year}</strong>
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                        Thời gian nộp bài: {activeSubmission.submittedAt}
                      </div>
                    </div>

                    {/* Khung hiển thị Số Điểm nổi bật */}
                    <div className="px-5 py-3 rounded-2xl bg-blue-50 border border-blue-300 text-center shrink-0 self-stretch sm:self-center flex flex-col items-center justify-center">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                        Điểm Trắc Nghiệm
                      </span>
                      <span className="font-display font-black text-2xl sm:text-3xl text-blue-600 tabular-nums mt-0.5">
                        {activeSubmission.score} / {activeSubmission.totalQuestions}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-300 text-center text-xs sm:text-sm text-slate-500">
                    Chưa có bài nộp nào. Sinh viên quét mã QR bên phải để điền thông tin &amp; hoàn thành 10 câu hỏi trắc nghiệm!
                  </div>
                )}

                {/* Danh sách chọn nhanh các bài nộp đang chờ quay */}
                {pendingSubmissions.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
                    <span className="text-xs text-slate-500 shrink-0">
                      Chờ quay ({pendingSubmissions.length}):
                    </span>
                    {pendingSubmissions.map((sub) => {
                      const isSelected = sub.id === activeSubmission?.id;
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => {
                            setSelectedSubmissionId(sub.id);
                            setSpinWarning(null);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 border ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600 font-bold'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-blue-50'
                          }`}
                        >
                          {sub.name} ({sub.score}/10)
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            {/* CỘT PHẢI (40%): KHUNG HÌNH QR CODE NẰM NGANG HÀNG VỚI VÒNG QUAY & LỊCH SỬ TRÚNG QUÀ */}
            <div className="w-full lg:w-[40%] flex flex-col gap-6">
              <section className="bg-white border border-blue-100 rounded-2xl p-5 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between gap-2 pb-3.5 mb-4 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-blue-600 shrink-0" />
                    <div>
                      <h2 className="font-display font-bold text-base sm:text-lg text-blue-900">
                        MÃ QR - THỬ THÁCH NHẬN QUÀ
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Quét mã trên điện thoại để nhập thông tin &amp; làm 10 câu hỏi trắc nghiệm
                      </p>
                    </div>
                  </div>
                </div>

                {/* Khung hiển thị Mã QR Code kích thước lớn */}
                <div className="flex flex-col items-center justify-center gap-3.5 p-5 rounded-2xl bg-blue-50/40 border border-blue-100">
                  <div className="w-64 h-64 sm:w-72 sm:h-72 rounded-2xl bg-white p-3 shadow-md shrink-0 flex items-center justify-center border-2 border-blue-500">
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt="Mã QR Thử Thách Nhận Quà"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-xs text-slate-400 text-center">Đang tạo QR...</div>
                    )}
                  </div>

                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className="text-xs sm:text-sm font-bold uppercase tracking-wider text-blue-600">
                      Quét QR Tham Gia Thử Thách
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyChallengeLink}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-blue-200 bg-white hover:bg-blue-50 text-blue-700 text-xs font-semibold transition cursor-pointer whitespace-nowrap shadow-2xs"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-600">Đã chép link</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-blue-600" />
                          <span>Sao chép link</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Bảng danh sách lịch sử các sinh viên vừa trúng quà */}
                <div className="mt-5 pt-4 border-t border-slate-200">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-blue-900">
                        Lịch sử sinh viên trúng quà
                      </h3>
                      <p className="text-[11px] text-slate-500 tabular-nums">
                        Đã lưu {history.length} ứng viên hoàn thành vòng quay
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleExportCSV}
                        disabled={history.length === 0}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                          history.length > 0
                            ? 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer shadow-xs'
                            : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                        }`}
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>Xuất file Excel/CSV</span>
                      </button>

                      {history.length > 0 && (
                        <button
                          type="button"
                          onClick={handleClearHistory}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 hover:border-red-400 text-slate-600 hover:text-red-600 text-xs transition cursor-pointer whitespace-nowrap"
                          title="Xóa toàn bộ lịch sử"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Xóa</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="overflow-x-auto max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-blue-50/60 text-blue-900 sticky top-0 z-10 border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-2.5 font-semibold">Sinh viên</th>
                          <th className="py-2.5 px-2 font-semibold">Khoa · Điểm</th>
                          <th className="py-2.5 px-2.5 font-semibold text-blue-700">Quà trúng</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {history.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="py-8 text-center text-slate-400">
                              Chưa có dữ liệu sinh viên quay thưởng.
                            </td>
                          </tr>
                        ) : (
                          history.map((item) => (
                            <tr key={item.id} className="hover:bg-blue-50/40 transition-colors">
                              <td className="py-2.5 px-2.5">
                                <div className="font-semibold text-slate-900">{item.name}</div>
                                <div className="text-[11px] font-mono tabular-nums text-slate-500">
                                  {item.phone} · {item.year}
                                </div>
                              </td>
                              <td className="py-2.5 px-2 text-slate-700">
                                <div>{item.department}</div>
                                <div className="text-[11px] font-mono tabular-nums text-emerald-600 font-semibold">
                                  Điểm: {item.score ?? 0}/10
                                </div>
                              </td>
                              <td className="py-2.5 px-2.5 font-semibold text-blue-700">
                                {item.prize}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>

        {/* ================= TAB 2: KHU VỰC QUẢN TRỊ ADMIN ================= */}
        <div className={activeMainTab === 'admin' ? 'block' : 'hidden'}>
          <section className="max-w-4xl mx-auto bg-white border border-blue-100 rounded-2xl p-5 sm:p-7 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between gap-2 pb-4 mb-5 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <Sliders className="w-5 h-5 text-blue-600 shrink-0" />
                <div>
                  <h2 className="font-display font-bold text-lg sm:text-xl text-blue-900">
                    Khu Vực Quản Trị Admin
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Cài đặt tên trường, số lượng quà, điều kiện trúng quà &amp; 10 câu hỏi trắc nghiệm
                  </p>
                </div>
              </div>

              {isAdminUnlocked && (
                <button
                  type="button"
                  onClick={handleLockAdmin}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition cursor-pointer whitespace-nowrap shadow-xs"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Khóa lại (Đăng xuất Admin)</span>
                </button>
              )}
            </div>

            {/* Nội dung điều chỉnh của Admin (Mặc định filter: blur(6px), pointer-events: none) */}
            <div
              style={
                !isAdminUnlocked
                  ? {
                      filter: 'blur(6px)',
                      pointerEvents: 'none',
                      userSelect: 'none'
                    }
                  : undefined
              }
              className="space-y-5 transition-all duration-300"
            >
              {/* 1. Nhập tên trường */}
              <div>
                <label
                  htmlFor="adminSchoolInput"
                  className="block text-xs font-bold text-blue-900 mb-1.5"
                >
                  1. Nhập tên trường (Đổi tiêu đề Header theo thời gian thực)
                </label>
                <input
                  id="adminSchoolInput"
                  type="text"
                  value={settings.schoolName}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, schoolName: e.target.value }))
                  }
                  placeholder="Ví dụ: Đại học Nông Lâm TP.HCM"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-blue-600"
                />
              </div>

              {/* 2. Danh sách quà tặng: Nút Add nhập tên quà + kế bên là số lượng quà */}
              <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/40 border border-blue-100 space-y-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-blue-800">
                    <Package className="w-4 h-4 text-blue-600" />
                    <span>2. Danh sách quà tặng &amp; Số lượng (Về 0 tự ẩn khỏi vòng quay)</span>
                  </div>
                  <span className="text-xs font-mono tabular-nums text-blue-700 font-semibold">
                    Còn: {totalRemainingQty} quà
                  </span>
                </div>

                {/* Thanh nhập bổ sung quà mới: Tên quà + Số lượng + Nút Add */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newPrizeName}
                    onChange={(e) => setNewPrizeName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddPrizeItem();
                      }
                    }}
                    placeholder="Nhập tên phần quà mới..."
                    className="flex-1 min-w-0 px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs sm:text-sm focus:outline-none focus:border-blue-600"
                  />
                  <input
                    type="number"
                    min={1}
                    value={newPrizeQty}
                    onChange={(e) => setNewPrizeQty(Math.max(0, Number(e.target.value) || 0))}
                    placeholder="SL"
                    title="Số lượng quà"
                    className="w-24 px-3 py-2 rounded-xl bg-white border border-slate-300 text-center font-mono text-xs sm:text-sm text-blue-700 font-semibold tabular-nums focus:outline-none focus:border-blue-600"
                  />
                  <button
                    type="button"
                    onClick={handleAddPrizeItem}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-display font-bold text-xs sm:text-sm transition cursor-pointer shrink-0 shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add</span>
                  </button>
                </div>

                {/* Danh sách các phần quà hiện có */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
                  {settings.prizeItems.map((item) => {
                    const isOut = Number(item.quantity) <= 0;
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border transition ${
                          isOut
                            ? 'bg-red-50/70 border-red-200 opacity-80'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleUpdatePrizeName(item.id, e.target.value)}
                          className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                        />

                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[11px] text-slate-500">SL:</span>
                          <input
                            type="number"
                            min={0}
                            value={item.quantity}
                            onChange={(e) =>
                              handleUpdatePrizeQuantity(item.id, Number(e.target.value))
                            }
                            className={`w-16 px-2 py-1 rounded-lg border text-center font-mono text-xs tabular-nums focus:outline-none ${
                              isOut
                                ? 'bg-red-50 border-red-300 text-red-600 font-bold'
                                : 'bg-white border-slate-300 text-blue-700 font-semibold'
                            }`}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemovePrizeItem(item.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-slate-100 transition cursor-pointer shrink-0"
                          title="Xóa phần quà này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. CẤU HÌNH PHẦN QUÀ THEO ĐIỂM SỐ & KHOA HỌC */}
              <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/40 border border-blue-100 space-y-4">
                <div className="text-xs sm:text-sm font-bold text-blue-800">
                  3. Điều chỉnh phần quà theo Khoa học &amp; Điểm số
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Nhóm 1: Phần quà dành cho tất cả Khoa học điểm lớn hơn 7 */}
                  <div className="p-4 rounded-xl bg-white border border-blue-100 space-y-3">
                    <div className="text-xs font-bold text-blue-700">
                      3.1. Phần quà dành cho tất cả Khoa học điểm lớn hơn 7 (Điểm &gt; 7)
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Chọn phần quà mục tiêu (Tất cả Khoa học đạt Điểm &gt; 7)
                      </label>
                      <select
                        value={settings.allDeptOver7TargetPrize}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            allDeptOver7TargetPrize: e.target.value
                          }))
                        }
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-blue-600"
                      >
                        {settings.prizeItems.map((p) => (
                          <option key={`over7-${p.id}`} value={p.name}>
                            {p.name} (Còn: {p.quantity})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-600">Tỷ lệ ưu tiên trúng quà (%)</span>
                        <span className="font-mono font-bold text-blue-600 tabular-nums">
                          {settings.allDeptOver7Rate}%
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={1}
                          value={settings.allDeptOver7Rate}
                          onChange={(e) =>
                            setSettings((prev) => ({
                              ...prev,
                              allDeptOver7Rate: Number(e.target.value)
                            }))
                          }
                          className="w-full accent-blue-600 cursor-pointer"
                        />
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={settings.allDeptOver7Rate}
                          onChange={(e) => {
                            const val = Math.max(
                              0,
                              Math.min(100, Number(e.target.value) || 0)
                            );
                            setSettings((prev) => ({
                              ...prev,
                              allDeptOver7Rate: val
                            }));
                          }}
                          className="w-16 px-2 py-1 rounded-lg bg-white border border-slate-300 text-center font-mono text-xs text-blue-700 font-semibold tabular-nums"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Nhóm 2: Phần quà dành cho Khoa Chăn nuôi, Thú y điểm lớn hơn 8 */}
                  <div className="p-4 rounded-xl bg-white border border-blue-100 space-y-3">
                    <div className="text-xs font-bold text-blue-700">
                      3.2. Phần quà dành cho Khoa Chăn nuôi, Thú y điểm lớn hơn 8 (Điểm &gt; 8)
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Từ khóa Khoa nhận diện (Cách nhau bởi dấu phẩy)
                      </label>
                      <input
                        type="text"
                        value={settings.vetDeptKeywords}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            vetDeptKeywords: e.target.value
                          }))
                        }
                        placeholder="Chăn nuôi, Thú y"
                        className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Chọn phần quà mục tiêu (Khoa Chăn nuôi, Thú y &amp; Điểm &gt; 8)
                      </label>
                      <select
                        value={settings.vetDeptOver8TargetPrize}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            vetDeptOver8TargetPrize: e.target.value
                          }))
                        }
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-blue-600"
                      >
                        {settings.prizeItems.map((p) => (
                          <option key={`vet8-${p.id}`} value={p.name}>
                            {p.name} (Còn: {p.quantity})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-600">Tỷ lệ ưu tiên trúng quà (%)</span>
                        <span className="font-mono font-bold text-blue-600 tabular-nums">
                          {settings.vetDeptOver8Rate}%
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={1}
                          value={settings.vetDeptOver8Rate}
                          onChange={(e) =>
                            setSettings((prev) => ({
                              ...prev,
                              vetDeptOver8Rate: Number(e.target.value)
                            }))
                          }
                          className="w-full accent-blue-600 cursor-pointer"
                        />
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={settings.vetDeptOver8Rate}
                          onChange={(e) => {
                            const val = Math.max(
                              0,
                              Math.min(100, Number(e.target.value) || 0)
                            );
                            setSettings((prev) => ({
                              ...prev,
                              vetDeptOver8Rate: val
                            }));
                          }}
                          className="w-16 px-2 py-1 rounded-lg bg-white border border-slate-300 text-center font-mono text-xs text-blue-700 font-semibold tabular-nums"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ghi chú Nhóm 3 */}
                <div className="px-3.5 py-2.5 rounded-xl bg-white border border-blue-100 text-xs text-slate-600 leading-relaxed">
                  <strong className="text-blue-700">3.3. Tất cả phần quà còn lại:</strong> Tự động
                  quay ngẫu nhiên công bằng trong các phần quà còn số lượng (&gt; 0), không cần
                  tham chiếu số điểm và Khoa học.
                </div>
              </div>

              {/* 4. TẠO DỰNG 10 CÂU HỎI TRẮC NGHIỆM (4 ĐÁP ÁN: 1 ĐÚNG, 3 SAI) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/40 border border-blue-100 space-y-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-blue-800">
                    <HelpCircle className="w-4 h-4 text-blue-600" />
                    <span>4. Thiết lập 10 Câu Hỏi Trắc Nghiệm (1 đúng, 3 sai)</span>
                  </div>
                  <span className="text-xs font-semibold text-blue-700">
                    Câu {activeQuestionTab + 1} / 10
                  </span>
                </div>

                {/* Thanh chọn câu hỏi từ 1 đến 10 */}
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                  {settings.questions.map((q, idx) => (
                    <button
                      key={q.id || idx}
                      type="button"
                      onClick={() => setActiveQuestionTab(idx)}
                      className={`py-2 rounded-lg font-mono text-xs font-bold transition cursor-pointer tabular-nums border ${
                        activeQuestionTab === idx
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white text-slate-700 hover:bg-blue-50 border-slate-200'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>

                {/* Khung soạn thảo câu hỏi đang chọn */}
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-blue-900 mb-1">
                      Nội dung Câu hỏi số {activeQuestionTab + 1}:
                    </label>
                    <textarea
                      rows={2}
                      value={currentEditingQuestion.question}
                      onChange={(e) =>
                        handleUpdateQuestionText(activeQuestionTab, e.target.value)
                      }
                      placeholder={`Nhập nội dung câu hỏi số ${activeQuestionTab + 1}...`}
                      className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs sm:text-sm focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs text-slate-600">
                      Nhập 4 đáp án và <strong>tích chọn 1 đáp án ĐÚNG</strong> (3 đáp án còn lại là sai):
                    </div>

                    {currentEditingQuestion.options.map((optValue, optIdx) => {
                      const isCorrect = currentEditingQuestion.correctIndex === optIdx;
                      return (
                        <div
                          key={optIdx}
                          className={`flex items-center gap-2 p-2.5 rounded-xl border transition ${
                            isCorrect
                              ? 'bg-blue-50 border-blue-400'
                              : 'bg-white border-slate-200'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateCorrectOption(activeQuestionTab, optIdx)
                            }
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 cursor-pointer transition ${
                              isCorrect
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                            title="Chọn làm đáp án đúng"
                          >
                            {OPTION_LABELS[optIdx]} {isCorrect ? '✓ Đúng' : '(Sai)'}
                          </button>

                          <input
                            type="text"
                            value={optValue}
                            onChange={(e) =>
                              handleUpdateOptionText(
                                activeQuestionTab,
                                optIdx,
                                e.target.value
                              )
                            }
                            placeholder={`Nhập đáp án ${OPTION_LABELS[optIdx]}...`}
                            className="flex-1 bg-transparent text-xs sm:text-sm text-slate-900 focus:outline-none"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 5. Nút Lưu cài đặt */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-display font-bold text-xs sm:text-sm transition cursor-pointer shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>Lưu cài đặt</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetDefaultSettings}
                  className="inline-flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl border border-slate-300 hover:bg-slate-100 bg-white text-slate-700 text-xs sm:text-sm font-medium transition cursor-pointer whitespace-nowrap"
                  title="Khôi phục về danh sách mẫu"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Mặc định</span>
                </button>
              </div>

              {saveSuccessMessage && (
                <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl py-2.5 px-3">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{saveSuccessMessage}</span>
                </div>
              )}
            </div>

            {/* LỚP PHỦ (OVERLAY) YÊU CẦU ĐĂNG NHẬP ADMIN KHI ĐANG KHÓA */}
            {!isAdminUnlocked && (
              <div className="absolute inset-0 z-20 bg-white/75 backdrop-blur-[2px] flex flex-col items-center justify-center p-5">
                <div className="w-full max-w-sm bg-white border border-blue-200 rounded-2xl p-6 shadow-xl">
                  <div className="text-center mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-100 border border-blue-300 text-blue-700 flex items-center justify-center mx-auto mb-2.5">
                      <Lock className="w-5 h-5" />
                    </div>
                    <h3 className="font-display font-bold text-base text-blue-900">
                      Mở Khóa Quản Trị Admin
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Khu vực cài đặt vòng quay, số lượng quà &amp; 10 câu hỏi
                    </p>
                  </div>

                  <form onSubmit={handleAdminLogin} className="space-y-3.5">
                    <div>
                      <label
                        htmlFor="adminUserField"
                        className="block text-xs font-semibold text-blue-900 mb-1"
                      >
                        Tài khoản Admin
                      </label>
                      <input
                        id="adminUserField"
                        type="text"
                        value={loginUsername}
                        onChange={(e) => {
                          setLoginUsername(e.target.value);
                          if (loginError) setLoginError(null);
                        }}
                        placeholder="Nhập tài khoản (Admin)"
                        autoComplete="username"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs sm:text-sm focus:outline-none focus:border-blue-600"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="adminPassField"
                        className="block text-xs font-semibold text-blue-900 mb-1"
                      >
                        Mật khẩu
                      </label>
                      <input
                        id="adminPassField"
                        type="password"
                        value={loginPassword}
                        onChange={(e) => {
                          setLoginPassword(e.target.value);
                          if (loginError) setLoginError(null);
                        }}
                        placeholder="Nhập mật khẩu"
                        autoComplete="current-password"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs sm:text-sm focus:outline-none focus:border-blue-600"
                      />
                    </div>

                    {loginError && (
                      <div className="text-xs text-red-600 font-medium text-center">
                        {loginError}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-display font-bold text-xs sm:text-sm transition cursor-pointer shadow-sm"
                    >
                      <Unlock className="w-4 h-4" />
                      <span>Đăng nhập &amp; Mở khóa</span>
                    </button>
                  </form>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* 3. POPUP (MODAL) CHÚC MỪNG SINH VIÊN KHI VÒNG QUAY DỪNG LẠI */}
      {winnerModalData && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white border-2 border-blue-500 rounded-3xl p-6 sm:p-8 text-center shadow-2xl relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 text-white flex items-center justify-center mx-auto mb-4 shadow-md">
              <Gift className="w-9 h-9" />
            </div>

            <div className="text-xs font-extrabold uppercase tracking-widest text-blue-600">
              Chúc Mừng Bạn Đã Trúng Thưởng!
            </div>

            <h3 className="font-display font-black text-2xl sm:text-3xl text-slate-900 mt-1.5">
              {winnerModalData.name}
            </h3>

            <div className="text-xs sm:text-sm text-slate-600 mt-1.5">
              {winnerModalData.school} · Khoa{' '}
              <strong className="text-blue-700">{winnerModalData.department}</strong> ·{' '}
              <span>{winnerModalData.year}</span>
            </div>
            <div className="text-xs font-mono tabular-nums text-emerald-600 font-semibold mt-1">
              Điểm Thử Thách: {winnerModalData.score}/10 · SĐT: {winnerModalData.phone}
            </div>

            <div className="my-6 py-5 px-5 rounded-2xl bg-blue-50 border border-blue-300">
              <div className="text-xs text-blue-800 font-medium mb-1">
                Phần quà nhận được từ chương trình:
              </div>
              <div className="font-display font-black text-xl sm:text-2xl text-blue-700 tracking-tight">
                {winnerModalData.prize}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setWinnerModalData(null)}
              className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-display font-extrabold text-sm transition cursor-pointer shadow-md"
            >
              Nhận quà &amp; Mời sinh viên tiếp theo
            </button>
          </div>
        </div>
      )}

      {/* THANH 2 TAB CÔNG CỤ (VÒNG QUAY & ADMIN) Ở DƯỚI CUỐI MÀN HÌNH */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30">
        <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md p-1.5 rounded-2xl border border-blue-200 shadow-lg">
          <button
            type="button"
            onClick={() => setActiveMainTab('wheel')}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-display font-bold text-xs sm:text-sm transition cursor-pointer ${
              activeMainTab === 'wheel'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50'
            }`}
          >
            <Disc className="w-4 h-4" />
            <span>Vòng quay</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab('admin')}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-display font-bold text-xs sm:text-sm transition cursor-pointer ${
              activeMainTab === 'admin'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Admin</span>
          </button>
        </div>
      </div>

      {/* Nút bật/tắt âm thanh (chỉ hiển thị hình cái loa, không có chữ, nằm ở phía dưới cùng giao diện) */}
      <div className="fixed bottom-4 right-5 z-30">
        <button
          type="button"
          onClick={() => setSoundEnabled((prev) => !prev)}
          className="w-12 h-12 rounded-full bg-white hover:bg-blue-50 border border-blue-200 hover:border-blue-500 shadow-lg flex items-center justify-center text-slate-700 transition-all cursor-pointer active:scale-95 group focus:outline-none focus:ring-2 focus:ring-blue-400/50"
          title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
          aria-label={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
        >
          {soundEnabled ? (
            <Volume2 className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
          ) : (
            <VolumeX className="w-5 h-5 text-slate-400 group-hover:scale-110 transition-transform" />
          )}
        </button>
      </div>
    </div>
  );
}
