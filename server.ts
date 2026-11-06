import express, { Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  DEFAULT_SETTINGS,
  DEFAULT_PRIZE_ITEMS,
  AppSettings,
  StudentSubmission,
  WinnerRecord,
  QuizQuestion,
  PrizeItem
} from './src/types.ts';

interface ServerState {
  settings: AppSettings;
  submissions: StudentSubmission[];
  history: WinnerRecord[];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'career_fair_state.json');

function loadPersistedState(): ServerState {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      const savedSettings = parsed.settings || {};
      return {
        settings: {
          ...DEFAULT_SETTINGS,
          ...savedSettings,
          prizeItems:
            Array.isArray(savedSettings.prizeItems) &&
            savedSettings.prizeItems.length > 0
              ? savedSettings.prizeItems
              : DEFAULT_PRIZE_ITEMS,
          questions:
            Array.isArray(savedSettings.questions) &&
            savedSettings.questions.length === 10
              ? savedSettings.questions
              : DEFAULT_SETTINGS.questions
        },
        submissions: Array.isArray(parsed.submissions) ? parsed.submissions : [],
        history: Array.isArray(parsed.history) ? parsed.history : []
      };
    }
  } catch (err) {
    console.error('Failed to read persisted state:', err);
  }
  return {
    settings: { ...DEFAULT_SETTINGS },
    submissions: [],
    history: []
  };
}

function savePersistedState(state: ServerState) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save persisted state:', err);
  }
}

const serverState: ServerState = loadPersistedState();
const sseClients = new Set<Response>();

function broadcastState() {
  const payload = `data: ${JSON.stringify({
    type: 'STATE_UPDATED',
    state: serverState
  })}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(payload);
    } catch {
      sseClients.delete(res);
    }
  }
}

async function startServer() {
  const app = express();

  // Enable CORS and disable caching on all API routes
  app.use('/api', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate'
    );
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  app.use(express.json({ limit: '2mb' }));

  // SSE endpoint for real-time sync between student phones and main wheel screen
  app.get('/api/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    res.write(
      `data: ${JSON.stringify({
        type: 'INITIAL_STATE',
        state: serverState
      })}\n\n`
    );

    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });
  });

  // Get current full state
  app.get('/api/state', (_req, res) => {
    res.json({
      ...serverState,
      appUrl: process.env.APP_URL || ''
    });
  });

  // Update Admin Settings
  app.post('/api/settings', (req, res) => {
    const incoming = req.body;
    if (!incoming || typeof incoming !== 'object') {
      res.status(400).json({ error: 'Dữ liệu cài đặt không hợp lệ' });
      return;
    }

    serverState.settings = {
      ...serverState.settings,
      ...incoming,
      prizeItems: Array.isArray(incoming.prizeItems)
        ? incoming.prizeItems
        : serverState.settings.prizeItems,
      questions:
        Array.isArray(incoming.questions) && incoming.questions.length === 10
          ? incoming.questions
          : serverState.settings.questions
    };

    savePersistedState(serverState);
    broadcastState();
    res.json({ ok: true, settings: serverState.settings });
  });

  // Student submits "Thử Thách Nhận Quà" from mobile QR scan
  app.post('/api/submissions', (req, res) => {
    const {
      id,
      name,
      phone,
      school,
      department,
      year,
      answers,
      score: clientScore,
      submittedAt: clientSubmittedAt
    } = req.body || {};

    if (!name || !phone || !school || !department || !year || !Array.isArray(answers)) {
      res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin và trả lời 10 câu hỏi' });
      return;
    }

    // If submission with this ID already exists, return it without duplicating
    if (id) {
      const existing = serverState.submissions.find(
        (s: StudentSubmission) => s.id === String(id)
      );
      if (existing) {
        res.json({ ok: true, submission: existing });
        return;
      }
    }

    const questions: QuizQuestion[] =
      serverState.settings.questions || DEFAULT_SETTINGS.questions;
    let computedScore = 0;
    questions.forEach((q: QuizQuestion, idx: number) => {
      if (Number(answers[idx]) === Number(q.correctIndex)) {
        computedScore += 1;
      }
    });

    const finalScore =
      typeof clientScore === 'number' && !Number.isNaN(clientScore)
        ? clientScore
        : computedScore;

    const now = new Date();
    const formattedTime =
      clientSubmittedAt ||
      `${now.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })} - ${now.toLocaleDateString('vi-VN')}`;

    const submission: StudentSubmission = {
      id: id ? String(id) : `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: String(name).trim(),
      phone: String(phone).trim(),
      school: String(school).trim(),
      department: String(department).trim(),
      year: String(year).trim(),
      answers: answers.map(Number),
      score: finalScore,
      totalQuestions: questions.length,
      submittedAt: String(formattedTime),
      hasSpun: false
    };

    serverState.submissions.unshift(submission);
    savePersistedState(serverState);
    broadcastState();

    res.json({ ok: true, submission });
  });

  // Record spin completion, decrement won prize quantity by 1, and save winner
  app.post('/api/spin-complete', (req, res) => {
    const { submissionId, prizeId, winnerRecord } = req.body || {};

    if (submissionId) {
      const sub = serverState.submissions.find(
        (s: StudentSubmission) => s.id === submissionId
      );
      if (sub) {
        sub.hasSpun = true;
        sub.wonPrize = winnerRecord?.prize || '';
      }
    }

    // Giảm số lượng phần quà trúng thưởng đi 1
    if (prizeId) {
      serverState.settings.prizeItems = serverState.settings.prizeItems.map(
        (item: PrizeItem) =>
          item.id === prizeId
            ? { ...item, quantity: Math.max(0, Number(item.quantity) - 1) }
            : item
      );
    } else if (winnerRecord?.prize) {
      let decremented = false;
      serverState.settings.prizeItems = serverState.settings.prizeItems.map(
        (item: PrizeItem) => {
          if (!decremented && item.name === winnerRecord.prize && item.quantity > 0) {
            decremented = true;
            return { ...item, quantity: Math.max(0, Number(item.quantity) - 1) };
          }
          return item;
        }
      );
    }

    if (winnerRecord && winnerRecord.id) {
      const exists = serverState.history.some(
        (h: WinnerRecord) => h.id === winnerRecord.id
      );
      if (!exists) {
        serverState.history.unshift(winnerRecord);
      }
    }

    savePersistedState(serverState);
    broadcastState();
    res.json({ ok: true, state: serverState });
  });

  // Clear history or submissions
  app.post('/api/clear-history', (req, res) => {
    const { clearSubmissions } = req.body || {};
    serverState.history = [];
    if (clearSubmissions) {
      serverState.submissions = [];
    }
    savePersistedState(serverState);
    broadcastState();
    res.json({ ok: true, state: serverState });
  });

  const isProd =
    process.env.NODE_ENV === 'production' &&
    fs.existsSync(path.join(__dirname, 'dist'));

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${port}`);
  });
}

startServer();
