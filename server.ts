import express, { Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  DEFAULT_SETTINGS,
  AppSettings,
  StudentSubmission,
  WinnerRecord,
  QuizQuestion
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
      return {
        settings: {
          ...DEFAULT_SETTINGS,
          ...(parsed.settings || {}),
          questions:
            Array.isArray(parsed.settings?.questions) &&
            parsed.settings.questions.length === 10
              ? parsed.settings.questions
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

  // Update Admin Settings (schoolName, prizes, 2 priority rules, 10 quiz questions)
  app.post('/api/settings', (req, res) => {
    const incoming = req.body;
    if (!incoming || typeof incoming !== 'object') {
      res.status(400).json({ error: 'Dữ liệu cài đặt không hợp lệ' });
      return;
    }

    serverState.settings = {
      ...serverState.settings,
      ...incoming,
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
    const { name, phone, school, department, year, answers } = req.body || {};
    if (!name || !phone || !school || !department || !year || !Array.isArray(answers)) {
      res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin và trả lời 10 câu hỏi' });
      return;
    }

    const questions: QuizQuestion[] =
      serverState.settings.questions || DEFAULT_SETTINGS.questions;
    let score = 0;
    questions.forEach((q: QuizQuestion, idx: number) => {
      if (Number(answers[idx]) === Number(q.correctIndex)) {
        score += 1;
      }
    });

    const now = new Date();
    const formattedTime = `${now.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })} - ${now.toLocaleDateString('vi-VN')}`;

    const submission: StudentSubmission = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: String(name).trim(),
      phone: String(phone).trim(),
      school: String(school).trim(),
      department: String(department).trim(),
      year: String(year).trim(),
      answers: answers.map(Number),
      score,
      totalQuestions: questions.length,
      submittedAt: formattedTime,
      hasSpun: false
    };

    serverState.submissions.unshift(submission);
    savePersistedState(serverState);
    broadcastState();

    res.json({ ok: true, submission });
  });

  // Record spin completion & prize won
  app.post('/api/spin-complete', (req, res) => {
    const { submissionId, winnerRecord } = req.body || {};
    if (submissionId) {
      const sub = serverState.submissions.find(
        (s: StudentSubmission) => s.id === submissionId
      );
      if (sub) {
        sub.hasSpun = true;
        sub.wonPrize = winnerRecord?.prize || '';
      }
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

  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(path.join(__dirname, 'dist'));

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
