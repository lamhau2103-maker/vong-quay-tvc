import { AppSettings, StudentSubmission, WinnerRecord } from './types';

export const STORAGE_KEY_SETTINGS = 'CNKD_CAREER_FAIR_SETTINGS_V3';
export const STORAGE_KEY_SUBMISSIONS = 'CNKD_CAREER_FAIR_SUBMISSIONS_V3';
export const STORAGE_KEY_HISTORY = 'CNKD_CAREER_FAIR_HISTORY_V3';

const CLOUD_SYNC_TOPIC = 'thaiviet_cnkd_live_48c56f76';
const CLOUD_SYNC_BASE_URL = `https://ntfy.sh/${CLOUD_SYNC_TOPIC}`;
const BROADCAST_CHANNEL_NAME = 'CNKD_REALTIME_SYNC_CHANNEL_V3';

export type SyncEventPayload =
  | {
      type: 'NEW_SUBMISSION';
      submission: StudentSubmission;
    }
  | {
      type: 'SPIN_COMPLETE';
      submissionId: string;
      prizeId: string;
      winnerRecord: WinnerRecord;
    }
  | {
      type: 'SCHOOL_UPDATED';
      schoolName: string;
    }
  | {
      type: 'SETTINGS_UPDATED';
      settings: Partial<AppSettings> & { schoolName: string };
    }
  | {
      type: 'CLEAR_HISTORY';
    };

/**
 * Gửi sự kiện đồng bộ qua BroadcastChannel (giữa các tab cùng trình duyệt)
 */
export function broadcastLocalChannelEvent(payload: SyncEventPayload): void {
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      bc.postMessage(payload);
      bc.close();
    }
  } catch {
    // Ignore
  }
}

/**
 * Lắng nghe sự kiện từ BroadcastChannel (giữa các tab cùng trình duyệt)
 */
export function subscribeLocalChannelEvents(
  onEvent: (payload: SyncEventPayload) => void
): () => void {
  if (typeof window === 'undefined' || !('BroadcastChannel' in window)) {
    return () => {};
  }
  try {
    const bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    const handler = (ev: MessageEvent) => {
      if (ev.data && typeof ev.data === 'object' && ev.data.type) {
        onEvent(ev.data as SyncEventPayload);
      }
    };
    bc.addEventListener('message', handler);
    return () => {
      bc.removeEventListener('message', handler);
      bc.close();
    };
  } catch {
    return () => {};
  }
}

/**
 * Đẩy sự kiện lên Cloud Relay (ntfy.sh) để điện thoại quét QR (kể cả khác mạng 4G/WiFi hoặc khác container ais-pre / ais-dev)
 * truyền thẳng thông tin bài nộp và tên trường về màn hình ngay lập tức.
 */
export async function publishCloudSyncEvent(payload: SyncEventPayload): Promise<void> {
  broadcastLocalChannelEvent(payload);
  try {
    if (payload.type === 'SETTINGS_UPDATED') {
      // Gửi gói tin nhỏ gọn (< 200 bytes) chứa schoolName để đảm bảo ntfy.sh không bao giờ vượt giới hạn 4KB
      const compactSchoolPayload: SyncEventPayload = {
        type: 'SCHOOL_UPDATED',
        schoolName: payload.settings.schoolName
      };
      await fetch(CLOUD_SYNC_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(compactSchoolPayload)
      });

      const fullStr = JSON.stringify(payload);
      if (new Blob([fullStr]).size <= 3800) {
        await fetch(CLOUD_SYNC_BASE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8'
          },
          body: fullStr
        });
      } else {
        // Nếu bộ câu hỏi lớn hơn 3.8KB, gửi cấu hình gọn không kèm mảng câu hỏi dài
        const { questions: _omittedQuestions, ...restSettings } = payload.settings;
        void _omittedQuestions;
        await fetch(CLOUD_SYNC_BASE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8'
          },
          body: JSON.stringify({
            type: 'SETTINGS_UPDATED',
            settings: restSettings
          })
        });
      }
      return;
    }

    await fetch(CLOUD_SYNC_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload)
    });
  } catch {
    // Ignore network error if offline
  }
}

/**
 * Đăng ký nhận sự kiện thời gian thực (SSE) từ Cloud Relay
 */
export function subscribeCloudSyncEvents(
  onEvent: (payload: SyncEventPayload) => void
): () => void {
  if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
    return () => {};
  }
  try {
    const es = new EventSource(`${CLOUD_SYNC_BASE_URL}/sse`);
    es.onmessage = (event) => {
      try {
        const envelope = JSON.parse(event.data);
        if (envelope?.event === 'message' && typeof envelope.message === 'string') {
          const parsed = JSON.parse(envelope.message) as SyncEventPayload;
          if (parsed && parsed.type) {
            onEvent(parsed);
          }
        }
      } catch {
        // Ignore malformed message
      }
    };
    return () => {
      es.close();
    };
  } catch {
    return () => {};
  }
}

/**
 * Tải toàn bộ sự kiện đồng bộ gần đây từ Cloud Relay (dùng khi tải trang hoặc bấm nút "Cập nhật danh sách")
 */
export async function fetchCloudSyncHistory(): Promise<SyncEventPayload[]> {
  try {
    const res = await fetch(`${CLOUD_SYNC_BASE_URL}/json?poll=1&since=24h`, {
      cache: 'no-store'
    });
    if (!res.ok) return [];
    const text = await res.text();
    const lines = text.split('\n').filter((line) => line.trim().length > 0);
    const events: SyncEventPayload[] = [];

    for (const line of lines) {
      try {
        const envelope = JSON.parse(line);
        if (envelope?.event === 'message' && typeof envelope.message === 'string') {
          const parsed = JSON.parse(envelope.message) as SyncEventPayload;
          if (parsed && parsed.type) {
            events.push(parsed);
          }
        }
      } catch {
        // Ignore line
      }
    }
    return events;
  } catch {
    return [];
  }
}

/**
 * Hợp nhất danh sách sinh viên từ nhiều nguồn (Server, Cloud Relay, LocalStorage) theo ID
 * Đảm bảo không bao giờ bị mất bài nộp và giữ nguyên trạng thái đã quay (hasSpun)
 */
export function mergeSubmissionsList(
  ...lists: (StudentSubmission[] | undefined | null)[]
): StudentSubmission[] {
  const map = new Map<string, StudentSubmission>();

  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (!item || !item.id || !item.name) continue;
      const existing = map.get(item.id);
      if (!existing) {
        map.set(item.id, { ...item });
      } else {
        map.set(item.id, {
          ...existing,
          ...item,
          hasSpun: Boolean(existing.hasSpun || item.hasSpun),
          wonPrize: existing.wonPrize || item.wonPrize
        });
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    const timeA = Number(String(a.id).split('-')[0]) || 0;
    const timeB = Number(String(b.id).split('-')[0]) || 0;
    return timeB - timeA;
  });
}

/**
 * Hợp nhất lịch sử trúng thưởng theo ID
 */
export function mergeHistoryList(
  ...lists: (WinnerRecord[] | undefined | null)[]
): WinnerRecord[] {
  const map = new Map<string, WinnerRecord>();

  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (!item || !item.id) continue;
      if (!map.has(item.id)) {
        map.set(item.id, item);
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    const timeA = Number(String(a.id).split('-')[0]) || 0;
    const timeB = Number(String(b.id).split('-')[0]) || 0;
    return timeB - timeA;
  });
}
