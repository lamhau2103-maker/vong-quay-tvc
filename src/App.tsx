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
  ExternalLink,
  Copy,
  Check,
  Award,
  HelpCircle,
  UserCheck
} from 'lucide-react';
import {
  AppSettings,
  StudentSubmission,
  WinnerRecord,
  DEFAULT_SETTINGS,
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

const STORAGE_KEY_SETTINGS = 'CNKD_CAREER_FAIR_SETTINGS_V2';
const STORAGE_KEY_SUBMISSIONS = 'CNKD_CAREER_FAIR_SUBMISSIONS_V2';
const STORAGE_KEY_HISTORY = 'CNKD_CAREER_FAIR_HISTORY_V2';

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
  // Kiểm tra chế độ hiển thị từ URL (?mode=challenge khi sinh viên quét mã QR trên điện thoại)
  const [isChallengeView, setIsChallengeView] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('mode') === 'challenge' || window.location.hash === '#challenge';
  });

  // --- STATE CẤU HÌNH ADMIN ---
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
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

  // Đường dẫn URL mở trang "Thử Thách Nhận Quà" khi sinh viên quét QR trên điện thoại
  const challengeUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}${window.location.pathname}?mode=challenge`;
  }, []);

  // Tạo ảnh QR Code sắc nét từ challengeUrl
  useEffect(() => {
    if (!challengeUrl) return;
    QRCode.toDataURL(challengeUrl, {
      width: 280,
      margin: 2,
      color: {
        dark: '#0F172A',
        light: '#FFFFFF'
      }
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => {});
  }, [challengeUrl]);

  // Kết nối Server API & Server-Sent Events (SSE) để đồng bộ thời gian thực giữa điện thoại sinh viên và màn hình Vòng Quay
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
            questions:
              Array.isArray(data.settings.questions) && data.settings.questions.length === 10
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

  // Danh sách sinh viên chưa quay thưởng
  const pendingSubmissions = useMemo(
    () => submissions.filter((s) => !s.hasSpun),
    [submissions]
  );

  // Tự động chọn sinh viên mới nhất vừa hoàn thành bài trắc nghiệm nếu chưa chọn ai
  useEffect(() => {
    if (pendingSubmissions.length > 0) {
      const stillPending = pendingSubmissions.some((s) => s.id === selectedSubmissionId);
      if (!stillPending) {
        setSelectedSubmissionId(pendingSubmissions[0].id);
        setSpinWarning(null);
      }
    } else {
      setSelectedSubmissionId(null);
    }
  }, [pendingSubmissions, selectedSubmissionId]);

  const activeStudent = useMemo(
    () => pendingSubmissions.find((s) => s.id === selectedSubmissionId) || null,
    [pendingSubmissions, selectedSubmissionId]
  );

  // Danh sách các phần quà được tách từ Textarea
  const prizesList = useMemo(() => {
    const lines = (settings.prizesText || '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    return lines.length > 0
      ? lines
      : ['Balo Laptop Thương Hiệu', 'Bình Giữ Nhiệt Cao Cấp', 'Áo Mưa Kỷ Niệm', 'Sổ Tay Sinh Viên'];
  }, [settings.prizesText]);

  // Đảm bảo Phần quà mục tiêu của cả 2 điều chỉnh luôn hợp lệ khi danh sách quà thay đổi
  useEffect(() => {
    if (prizesList.length === 0) return;
    setSettings((prev) => {
      let updated = false;
      const next = { ...prev };
      if (!prizesList.includes(prev.highScoreTargetPrize)) {
        next.highScoreTargetPrize = prizesList[0];
        updated = true;
      }
      if (!prizesList.includes(prev.vetDeptTargetPrize)) {
        next.vetDeptTargetPrize = prizesList[Math.min(1, prizesList.length - 1)];
        updated = true;
      }
      return updated ? next : prev;
    });
  }, [prizesList]);

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
      const count = prizesList.length;
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
      ctx.strokeStyle = '#FEF9C3';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, wheelRadius + 18, 0, Math.PI * 2);
      ctx.fillStyle = '#0F172A';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#F59E0B';
      ctx.stroke();
      ctx.restore();

      // 2. Vẽ các ô quạt phần thưởng
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

        const rawLabel = prizesList[i];
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
    [prizesList]
  );

  useEffect(() => {
    if (!isChallengeView) {
      drawWheel(currentRotationRef.current);
    }
  }, [drawWheel, isChallengeView]);

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

  // --- THUẬT TOÁN CHỌN QUÀ THEO 2 ĐIỀU CHỈNH CỦA ADMIN ---
  // 1. Phần quà dành cho tất cả các Khoa và đạt lớn hơn điểm 8 (score > 8)
  // 2. Phần quà dành cho Khoa Chăn nuôi, Thú y
  const chooseWinningPrizeIndex = useCallback(
    (student: StudentSubmission): { index: number; appliedRule?: string } => {
      const findIndicesForPrize = (prizeName: string): number[] => {
        const normTarget = normalizeVietnamese(prizeName);
        if (!normTarget) return [];
        const matched: number[] = [];
        prizesList.forEach((p, idx) => {
          if (normalizeVietnamese(p) === normTarget) {
            matched.push(idx);
          }
        });
        return matched;
      };

      const isHighScore = student.score > 8;
      const isVetDept = checkIsVetDepartment(student.department);

      // Điều chỉnh 1: Tất cả các Khoa và đạt điểm > 8
      if (isHighScore) {
        const rate1 = Math.max(0, Math.min(100, Number(settings.highScorePriorityRate) || 0));
        const targetIndices1 = findIndicesForPrize(settings.highScoreTargetPrize);
        if (rate1 > 0 && targetIndices1.length > 0) {
          if (Math.random() * 100 < rate1) {
            const chosen = targetIndices1[Math.floor(Math.random() * targetIndices1.length)];
            return { index: chosen, appliedRule: 'Tất cả các Khoa & Điểm > 8' };
          }
        }
      }

      // Điều chỉnh 2: Khoa Chăn nuôi, Thú y
      if (isVetDept) {
        const rate2 = Math.max(0, Math.min(100, Number(settings.vetDeptPriorityRate) || 0));
        const targetIndices2 = findIndicesForPrize(settings.vetDeptTargetPrize);
        if (rate2 > 0 && targetIndices2.length > 0) {
          if (Math.random() * 100 < rate2) {
            const chosen = targetIndices2[Math.floor(Math.random() * targetIndices2.length)];
            return { index: chosen, appliedRule: 'Khoa Chăn nuôi, Thú y' };
          }
        }
      }

      // Ngẫu nhiên công bằng cho các trường hợp còn lại
      const randomIndex = Math.floor(Math.random() * prizesList.length);
      return { index: randomIndex };
    },
    [
      checkIsVetDepartment,
      prizesList,
      settings.highScorePriorityRate,
      settings.highScoreTargetPrize,
      settings.vetDeptPriorityRate,
      settings.vetDeptTargetPrize
    ]
  );

  // --- XỬ LÝ QUAY VÒNG QUAY ---
  const handleSpinWheel = () => {
    if (isSpinning) return;
    getAudioContext();

    if (!activeStudent) {
      setSpinWarning(
        'Chưa có sinh viên nào trong danh sách chờ quay! Vui lòng quét mã QR để hoàn thành Thử Thách Nhận Quà trước khi quay.'
      );
      return;
    }

    setSpinWarning(null);
    setIsSpinning(true);

    const count = prizesList.length;
    const sliceAngle = (Math.PI * 2) / count;
    const { index: winningIndex, appliedRule } = chooseWinningPrizeIndex(activeStudent);

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

    const spinningStudent = activeStudent;

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
        const wonPrize = prizesList[winningIndex];
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
          prize: wonPrize,
          timestamp: formattedTime,
          appliedRule
        };

        setSubmissions((prev) =>
          prev.map((s) =>
            s.id === spinningStudent.id ? { ...s, hasSpun: true, wonPrize } : s
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
            winnerRecord: newRecord
          })
        }).catch(() => {});
      }
    };

    requestAnimationFrame(animate);
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

  // Lưu toàn bộ cấu hình (bao gồm 10 câu hỏi & 2 điều chỉnh tỷ lệ trúng quà)
  const handleSaveSettings = async () => {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      }).catch(() => {});
      setSaveSuccessMessage('Đã lưu toàn bộ cài đặt & bộ 10 câu hỏi thành công!');
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
    setSaveSuccessMessage('Đã khôi phục cấu hình và 10 câu hỏi mẫu mặc định!');
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

  // Xuất file Excel/CSV đầy đủ thông tin + Điểm trắc nghiệm
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

  // Nếu đang mở trang "Thử Thách Nhận Quà" trên điện thoại (hoặc chế độ xem thử)
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
        onBackToWheel={() => {
          const url = new URL(window.location.href);
          url.searchParams.delete('mode');
          window.history.pushState({}, '', url.toString());
          setIsChallengeView(false);
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
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950 via-slate-950 to-slate-950 text-slate-100 flex flex-col">
      {/* Canvas Pháo Hoa Confetti */}
      <canvas
        ref={confettiCanvasRef}
        className="fixed inset-0 pointer-events-none z-50 w-full h-full"
      />

      {/* 1. HEADER (PHÍA TRÊN CÙNG) */}
      <header className="sticky top-0 z-30 border-b border-amber-500/25 bg-slate-950/90 backdrop-blur-md shadow-lg">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-3.5 flex flex-col xl:flex-row items-center justify-between gap-3">
          {/* Brand Lockup: Logo Thai Viet Corporation */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="h-12 w-12 rounded-xl bg-white shadow-md p-1 flex items-center justify-center border border-slate-700/60 shrink-0 overflow-hidden">
              <img
                src="/assets/aistudio/9D442E44-DA18-4359-A1C0-B96CEA80BA07-removebg-preview_388b18da.png"
                alt="Thai Viet Corporation"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="text-left">
              <div className="text-xs sm:text-sm font-black tracking-wide uppercase text-amber-400 font-display">
                CÔNG TY CỔ PHẦN THÁI VIỆT CORPORATION
              </div>
              <div className="text-[11px] text-slate-400 font-medium">
                Bộ phận Tuyển dụng &amp; Kết nối Sinh viên
              </div>
            </div>
          </div>

          {/* Tiêu đề chính căn giữa, tự động cập nhật theo thời gian thực */}
          <h1 className="font-display font-black text-lg sm:text-2xl lg:text-[24px] text-center tracking-tight leading-snug bg-gradient-to-r from-amber-200 via-yellow-300 to-orange-400 bg-clip-text text-transparent drop-shadow-sm max-w-3xl">
            NGÀY HỘI VIỆC LÀM CÙNG TRƯỜNG {displaySchoolName}
          </h1>
        </div>
      </header>

      {/* 2. THÂN CHƯƠNG TRÌNH (CHIA 2 CỘT: 60% TRÁI - 40% PHẢI) */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-6 items-stretch">
          {/* ================= CỘT BÊN TRÁI (60%): VÒNG QUAY CHIẾC NÓN KỲ DIỆU ================= */}
          <section className="w-full lg:w-[60%] bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-7 flex flex-col items-center justify-between shadow-2xl relative overflow-hidden">
            {/* Thông tin sinh viên đang được chọn quay */}
            {activeStudent && (
              <div className="w-full mb-3 px-4 py-2.5 rounded-xl bg-emerald-950/70 border border-emerald-500/40 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-emerald-300 font-semibold">Lượt quay của:</span>
                  <strong className="text-white">{activeStudent.name}</strong>
                  <span className="text-slate-400">·</span>
                  <span className="text-amber-300 font-medium">{activeStudent.department}</span>
                </div>
                <span className="text-xs font-mono tabular-nums font-bold text-amber-300">
                  Điểm Thử Thách: {activeStudent.score}/{activeStudent.totalQuestions}
                </span>
              </div>
            )}

            {spinWarning && (
              <div className="w-full mb-3 px-4 py-2.5 rounded-xl bg-red-950/90 border border-red-500/60 flex items-center gap-2 text-xs text-red-200 font-medium">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{spinWarning}</span>
              </div>
            )}

            {/* Khu vực Vòng Quay Canvas */}
            <div className="relative flex items-center justify-center my-2 w-full max-w-[560px] aspect-square">
              <div className="absolute inset-2 rounded-full bg-gradient-to-tr from-amber-500/20 via-red-600/15 to-indigo-500/20 blur-2xl pointer-events-none" />

              {/* Kim chỉ định vị trí trúng thưởng ở đỉnh */}
              <div
                className="absolute -top-3.5 left-1/2 z-20 pointer-events-none transition-transform duration-75"
                style={{
                  transform: `translateX(-50%) rotate(${pointerBounceAngle}deg)`,
                  transformOrigin: '50% 12px'
                }}
              >
                <svg
                  width="58"
                  height="70"
                  viewBox="0 0 58 70"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="drop-shadow-[0_8px_14px_rgba(0,0,0,0.75)]"
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
                className="w-full h-full rounded-full shadow-[0_0_55px_rgba(0,0,0,0.85)]"
              />

              {/* Nút "QUAY NGAY" ở chính giữa vòng quay */}
              <button
                type="button"
                onClick={handleSpinWheel}
                disabled={isSpinning}
                className={`absolute z-20 w-28 h-28 sm:w-32 sm:h-32 rounded-full p-1.5 bg-gradient-to-b from-yellow-200 via-amber-400 to-amber-600 shadow-[0_0_35px_rgba(245,158,11,0.75)] transition-transform focus:outline-none ${
                  isSpinning
                    ? 'scale-95 opacity-90 cursor-wait'
                    : 'hover:scale-105 active:scale-95 cursor-pointer'
                }`}
                aria-label="Quay ngay"
              >
                <div className="w-full h-full rounded-full bg-gradient-to-b from-red-600 via-red-700 to-red-950 border-2 border-amber-200 flex flex-col items-center justify-center text-center px-2 shadow-inner">
                  <span className="font-display font-black text-white text-sm sm:text-base leading-tight tracking-wider drop-shadow">
                    {isSpinning ? 'ĐANG\nQUAY...' : 'QUAY\nNGAY'}
                  </span>
                </div>
              </button>
            </div>

            {/* Chân trang khu vực vòng quay */}
            <div className="w-full mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span className="font-mono tabular-nums text-slate-400">
                Tổng lượt quay: <strong className="text-amber-400">{history.length}</strong>
              </span>
              <span className="font-mono tabular-nums text-amber-300 font-semibold">
                Số ô quà hiện tại: {prizesList.length} ô
              </span>
            </div>
          </section>

          {/* ================= CỘT BÊN PHẢI (40%): MÃ QR THỬ THÁCH NHẬN QUÀ & KHU VỰC ADMIN ================= */}
          <div className="w-full lg:w-[40%] flex flex-col gap-6">
            {/* KHỐI TRÊN: MÃ QR CODE "THỬ THÁCH NHẬN QUÀ" & DANH SÁCH CHỜ QUAY */}
            <section className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl">
              <div className="flex items-center justify-between gap-2 pb-3.5 mb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <h2 className="font-display font-bold text-base sm:text-lg text-white">
                      QUÉT MÃ QR - THỬ THÁCH NHẬN QUÀ
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Sinh viên quét mã trên điện thoại, trả lời 10 câu trắc nghiệm để nhận lượt quay
                    </p>
                  </div>
                </div>
              </div>

              {/* Khung hiển thị Mã QR Code */}
              <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-slate-950/90 border border-slate-800">
                <div className="w-44 h-44 rounded-2xl bg-white p-2.5 shadow-lg shrink-0 flex items-center justify-center border-2 border-amber-400">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="Mã QR Thử Thách Nhận Quà"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-xs text-slate-500 text-center">Đang tạo QR...</div>
                  )}
                </div>

                <div className="flex-1 space-y-3 text-center sm:text-left">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
                      Trang: Thử Thách Nhận Quà
                    </div>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      Mở Camera hoặc Zalo trên điện thoại để quét mã QR. Hoàn thành thông tin cá nhân và <strong>10 câu hỏi trắc nghiệm</strong>, hệ thống sẽ tự chấm điểm và kích hoạt vòng quay!
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <button
                      type="button"
                      onClick={() => setIsChallengeView(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-display font-bold text-xs transition cursor-pointer shadow-md whitespace-nowrap"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Mở trang Thử Thách</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyChallengeLink}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold transition cursor-pointer whitespace-nowrap"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Đã chép link</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                          <span>Sao chép link</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Danh sách Sinh viên vừa nộp bài Thử Thách (Chờ quay thưởng) */}
              <div className="mt-5 pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-400" />
                    <h3 className="text-xs sm:text-sm font-bold text-white">
                      Sinh viên đã hoàn thành bài thi ({pendingSubmissions.length} chờ quay)
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-400">Tự động cập nhật</span>
                </div>

                {pendingSubmissions.length === 0 ? (
                  <div className="py-5 px-4 rounded-xl border border-dashed border-slate-800 bg-slate-950/50 text-center text-xs text-slate-400">
                    Chưa có sinh viên nào trong hàng đợi. Hãy quét mã QR phía trên hoặc bấm <strong>"Mở trang Thử Thách"</strong> để bắt đầu!
                  </div>
                ) : (
                  <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                    {pendingSubmissions.map((sub) => {
                      const isSelected = sub.id === selectedSubmissionId;
                      return (
                        <div
                          key={sub.id}
                          onClick={() => {
                            setSelectedSubmissionId(sub.id);
                            setSpinWarning(null);
                          }}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition cursor-pointer ${
                            isSelected
                              ? 'bg-amber-400/15 border-amber-400 shadow-sm'
                              : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs sm:text-sm text-white truncate">
                                {sub.name}
                              </span>
                              <span className="text-slate-500">·</span>
                              <span
                                className={`text-xs font-mono font-bold tabular-nums ${
                                  sub.score > 8 ? 'text-emerald-400' : 'text-amber-300'
                                }`}
                              >
                                {sub.score}/{sub.totalQuestions} điểm
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 truncate mt-0.5">
                              {sub.school} · Khoa {sub.department} · {sub.year} · {sub.phone}
                            </div>
                          </div>

                          <button
                            type="button"
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold shrink-0 transition whitespace-nowrap ${
                              isSelected
                                ? 'bg-amber-400 text-slate-950'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            {isSelected ? 'Đang chọn quay' : 'Chọn quay'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Bảng danh sách lịch sử các sinh viên vừa trúng quà */}
              <div className="mt-5 pt-4 border-t border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-white">
                      Lịch sử sinh viên trúng quà
                    </h3>
                    <p className="text-[11px] text-slate-400 tabular-nums">
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
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-sm'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Xuất file Excel/CSV</span>
                    </button>

                    {history.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearHistory}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-700 hover:border-red-500/50 text-slate-400 hover:text-red-300 text-xs transition cursor-pointer whitespace-nowrap"
                        title="Xóa toàn bộ lịch sử"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto max-h-52 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/80">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-900 text-slate-400 sticky top-0 z-10 border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-2.5 font-semibold">Sinh viên</th>
                        <th className="py-2.5 px-2 font-semibold">Khoa · Điểm</th>
                        <th className="py-2.5 px-2.5 font-semibold text-amber-400">Quà trúng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {history.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-6 text-center text-slate-500">
                            Chưa có dữ liệu sinh viên quay thưởng.
                          </td>
                        </tr>
                      ) : (
                        history.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-900/70 transition-colors">
                            <td className="py-2 px-2.5">
                              <div className="font-semibold text-white">{item.name}</div>
                              <div className="text-[11px] font-mono tabular-nums text-slate-400">
                                {item.phone} · {item.year}
                              </div>
                            </td>
                            <td className="py-2 px-2 text-slate-300">
                              <div>{item.department}</div>
                              <div className="text-[11px] font-mono tabular-nums text-emerald-400 font-semibold">
                                Điểm: {item.score ?? 0}/10
                              </div>
                            </td>
                            <td className="py-2 px-2.5 font-semibold text-amber-300">
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

            {/* KHỐI DƯỚI: KHU VỰC QUẢN TRỊ ADMIN (BẢO MẬT & LÀM MỜ) */}
            <section className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between gap-2 pb-3.5 mb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <h2 className="font-display font-bold text-base sm:text-lg text-white">
                      Khu Vực Quản Trị Admin
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Cài đặt tên trường, phần quà, tỷ lệ trúng quà &amp; 10 câu hỏi trắc nghiệm
                    </p>
                  </div>
                </div>

                {isAdminUnlocked && (
                  <button
                    type="button"
                    onClick={handleLockAdmin}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition cursor-pointer whitespace-nowrap shadow-sm"
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
                className="space-y-4 transition-all duration-300"
              >
                {/* 1. Nhập tên trường */}
                <div>
                  <label
                    htmlFor="adminSchoolInput"
                    className="block text-xs font-semibold text-slate-200 mb-1"
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
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* 2. Danh sách phần quà (Textarea) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="adminPrizesInput"
                      className="block text-xs font-semibold text-slate-200"
                    >
                      2. Danh sách phần quà (Mỗi dòng 1 phần quà)
                    </label>
                    <span className="text-[11px] text-amber-400 font-medium">
                      Đang hiển thị: {prizesList.length} ô quạt
                    </span>
                  </div>
                  <textarea
                    id="adminPrizesInput"
                    rows={4}
                    value={settings.prizesText}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, prizesText: e.target.value }))
                    }
                    placeholder="Nhập mỗi dòng là một phần quà..."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs sm:text-sm leading-relaxed focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* 3. ĐIỀU CHỈNH TỶ LỆ TRÚNG QUÀ THEO 2 ĐIỀU CHỈNH */}
                <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-4">
                  <div className="text-xs font-bold text-amber-400">
                    3. Điều chỉnh tỷ lệ trúng quà (2 điều chỉnh ưu tiên)
                  </div>

                  {/* Điều chỉnh 3.1: Phần quà dành cho tất cả các Khoa và đạt lớn hơn điểm 8 */}
                  <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5">
                    <div className="text-xs font-bold text-emerald-400">
                      3.1. Phần quà dành cho Tất cả các Khoa &amp; đạt lớn hơn điểm 8 (Điểm &gt; 8)
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-300 mb-1">
                        Chọn phần quà mục tiêu (Khi đạt &gt; 8 điểm)
                      </label>
                      <select
                        value={settings.highScoreTargetPrize}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            highScoreTargetPrize: e.target.value
                          }))
                        }
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-amber-400"
                      >
                        {prizesList.map((prize, idx) => (
                          <option key={`hs-${prize}-${idx}`} value={prize}>
                            {prize}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-300">Tỷ lệ ưu tiên trúng quà (%)</span>
                        <span className="font-mono font-bold text-emerald-400 tabular-nums">
                          {settings.highScorePriorityRate}%
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={1}
                          value={settings.highScorePriorityRate}
                          onChange={(e) =>
                            setSettings((prev) => ({
                              ...prev,
                              highScorePriorityRate: Number(e.target.value)
                            }))
                          }
                          className="w-full accent-emerald-400 cursor-pointer"
                        />
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={settings.highScorePriorityRate}
                          onChange={(e) => {
                            const val = Math.max(
                              0,
                              Math.min(100, Number(e.target.value) || 0)
                            );
                            setSettings((prev) => ({
                              ...prev,
                              highScorePriorityRate: val
                            }));
                          }}
                          className="w-16 px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-center font-mono text-xs text-emerald-300 tabular-nums"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Điều chỉnh 3.2: Phần quà dành cho Khoa Chăn nuôi, Thú y */}
                  <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5">
                    <div className="text-xs font-bold text-amber-300">
                      3.2. Phần quà dành cho Khoa Chăn nuôi, Thú y
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-300 mb-1">
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
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-300 mb-1">
                        Chọn phần quà mục tiêu (Khoa Chăn nuôi, Thú y)
                      </label>
                      <select
                        value={settings.vetDeptTargetPrize}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            vetDeptTargetPrize: e.target.value
                          }))
                        }
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-amber-400"
                      >
                        {prizesList.map((prize, idx) => (
                          <option key={`vet-${prize}-${idx}`} value={prize}>
                            {prize}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-300">Tỷ lệ ưu tiên trúng quà (%)</span>
                        <span className="font-mono font-bold text-amber-400 tabular-nums">
                          {settings.vetDeptPriorityRate}%
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={1}
                          value={settings.vetDeptPriorityRate}
                          onChange={(e) =>
                            setSettings((prev) => ({
                              ...prev,
                              vetDeptPriorityRate: Number(e.target.value)
                            }))
                          }
                          className="w-full accent-amber-400 cursor-pointer"
                        />
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={settings.vetDeptPriorityRate}
                          onChange={(e) => {
                            const val = Math.max(
                              0,
                              Math.min(100, Number(e.target.value) || 0)
                            );
                            setSettings((prev) => ({
                              ...prev,
                              vetDeptPriorityRate: val
                            }));
                          }}
                          className="w-16 px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-center font-mono text-xs text-amber-300 tabular-nums"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. TẠO DỰNG 10 CÂU HỎI TRẮC NGHIỆM (4 ĐÁP ÁN: 1 ĐÚNG, 3 SAI) */}
                <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                      <HelpCircle className="w-4 h-4" />
                      <span>4. Thiết lập 10 Câu Hỏi Trắc Nghiệm (1 đúng, 3 sai)</span>
                    </div>
                    <span className="text-[11px] text-slate-400">
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
                        className={`py-1.5 rounded-lg font-mono text-xs font-bold transition cursor-pointer tabular-nums ${
                          activeQuestionTab === idx
                            ? 'bg-amber-400 text-slate-950 shadow-sm'
                            : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>

                  {/* Khung soạn thảo câu hỏi đang chọn */}
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Nội dung Câu hỏi số {activeQuestionTab + 1}:
                      </label>
                      <textarea
                        rows={2}
                        value={currentEditingQuestion.question}
                        onChange={(e) =>
                          handleUpdateQuestionText(activeQuestionTab, e.target.value)
                        }
                        placeholder={`Nhập nội dung câu hỏi số ${activeQuestionTab + 1}...`}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="text-[11px] text-slate-400">
                        Nhập 4 đáp án và <strong>tích chọn 1 đáp án ĐÚNG</strong> (3 đáp án còn lại là sai):
                      </div>

                      {currentEditingQuestion.options.map((optValue, optIdx) => {
                        const isCorrect = currentEditingQuestion.correctIndex === optIdx;
                        return (
                          <div
                            key={optIdx}
                            className={`flex items-center gap-2 p-2 rounded-lg border transition ${
                              isCorrect
                                ? 'bg-emerald-950/40 border-emerald-500/50'
                                : 'bg-slate-900/70 border-slate-800'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateCorrectOption(activeQuestionTab, optIdx)
                              }
                              className={`px-2 py-1 rounded text-[11px] font-bold shrink-0 cursor-pointer transition ${
                                isCorrect
                                  ? 'bg-emerald-500 text-slate-950'
                                  : 'bg-slate-800 text-slate-400 hover:text-white'
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
                              className="flex-1 bg-transparent text-xs text-slate-100 focus:outline-none"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 5. Nút Lưu cài đặt */}
                <div className="flex items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={handleSaveSettings}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-bold text-xs sm:text-sm transition cursor-pointer shadow-md"
                  >
                    <Save className="w-4 h-4" />
                    <span>Lưu cài đặt</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetDefaultSettings}
                    className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-slate-700 hover:border-slate-600 bg-slate-950 text-slate-300 hover:text-white text-xs font-medium transition cursor-pointer whitespace-nowrap"
                    title="Khôi phục về danh sách mẫu"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Mặc định</span>
                  </button>
                </div>

                {saveSuccessMessage && (
                  <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 rounded-xl py-2 px-3">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{saveSuccessMessage}</span>
                  </div>
                )}
              </div>

              {/* LỚP PHỦ (OVERLAY) YÊU CẦU ĐĂNG NHẬP ADMIN KHI ĐANG KHÓA */}
              {!isAdminUnlocked && (
                <div className="absolute inset-0 z-20 bg-slate-950/70 backdrop-blur-[2px] flex flex-col items-center justify-center p-5">
                  <div className="w-full max-w-xs bg-slate-900/95 border border-slate-700 rounded-2xl p-5 shadow-2xl">
                    <div className="text-center mb-4">
                      <div className="w-11 h-11 rounded-2xl bg-amber-400/15 border border-amber-400/40 text-amber-300 flex items-center justify-center mx-auto mb-2.5">
                        <Lock className="w-5 h-5" />
                      </div>
                      <h3 className="font-display font-bold text-sm text-white">
                        Mở Khóa Quản Trị Admin
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Khu vực cài đặt vòng quay, tỷ lệ quà &amp; 10 câu hỏi
                      </p>
                    </div>

                    <form onSubmit={handleAdminLogin} className="space-y-3">
                      <div>
                        <label
                          htmlFor="adminUserField"
                          className="block text-[11px] font-semibold text-slate-300 mb-1"
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
                          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-amber-400"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="adminPassField"
                          className="block text-[11px] font-semibold text-slate-300 mb-1"
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
                          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-amber-400"
                        />
                      </div>

                      {loginError && (
                        <div className="text-[11px] text-red-400 font-medium text-center">
                          {loginError}
                        </div>
                      )}

                      <button
                        type="submit"
                        className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-display font-bold text-xs transition cursor-pointer shadow-md"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Đăng nhập &amp; Mở khóa</span>
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      {/* 3. POPUP (MODAL) CHÚC MỪNG SINH VIÊN KHI VÒNG QUAY DỪNG LẠI */}
      {winnerModalData && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-amber-400 rounded-3xl p-6 sm:p-8 text-center shadow-[0_0_70px_rgba(245,158,11,0.4)] relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-300 via-amber-500 to-orange-600 text-slate-950 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/30">
              <Gift className="w-9 h-9" />
            </div>

            <div className="text-xs font-extrabold uppercase tracking-widest text-amber-400">
              Chúc Mừng Bạn Đã Trúng Thưởng!
            </div>

            <h3 className="font-display font-black text-2xl sm:text-3xl text-white mt-1.5">
              {winnerModalData.name}
            </h3>

            <div className="text-xs sm:text-sm text-slate-300 mt-1.5">
              {winnerModalData.school} · Khoa{' '}
              <strong className="text-white">{winnerModalData.department}</strong> ·{' '}
              <span>{winnerModalData.year}</span>
            </div>
            <div className="text-xs font-mono tabular-nums text-emerald-400 font-semibold mt-1">
              Điểm Thử Thách: {winnerModalData.score}/10 · SĐT: {winnerModalData.phone}
            </div>

            <div className="my-6 py-5 px-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/25 to-red-500/15 border border-amber-400/50">
              <div className="text-xs text-amber-200 font-medium mb-1">
                Phần quà nhận được từ chương trình:
              </div>
              <div className="font-display font-black text-xl sm:text-2xl text-amber-300 tracking-tight">
                {winnerModalData.prize}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setWinnerModalData(null)}
              className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-display font-extrabold text-sm transition cursor-pointer shadow-lg shadow-amber-500/25"
            >
              Nhận quà &amp; Mời sinh viên tiếp theo
            </button>
          </div>
        </div>
      )}

      {/* Nút bật/tắt âm thanh (chỉ hiển thị hình cái loa, không có chữ, nằm ở phía dưới cùng giao diện) */}
      <div className="fixed bottom-5 right-5 z-30">
        <button
          type="button"
          onClick={() => setSoundEnabled((prev) => !prev)}
          className="w-12 h-12 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-400/70 shadow-2xl flex items-center justify-center text-slate-200 transition-all cursor-pointer backdrop-blur-md active:scale-95 group focus:outline-none focus:ring-2 focus:ring-amber-400/50"
          title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
          aria-label={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
        >
          {soundEnabled ? (
            <Volume2 className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
          ) : (
            <VolumeX className="w-5 h-5 text-slate-400 group-hover:scale-110 transition-transform" />
          )}
        </button>
      </div>
    </div>
  );
}
