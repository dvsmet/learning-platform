import { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box, Typography, List, ListItemButton, ListItemText, Paper,
  TextField, Button, CircularProgress, Alert, Divider, InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import SendIcon from '@mui/icons-material/Send';
import { getChatThreads, getChatMessages, sendChatMessage, markChatRead } from '../../api/chat';
import ChatMessageBubble from '../../components/ChatMessageBubble';
import { useAuth } from '../../context/AuthContext';

const POLL_INTERVAL = 4000;

export default function ChatTab() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [allThreads, setAllThreads] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [threadSearch, setThreadSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  /** Чтобы не сбрасывать выбор при открытии чата с карточки курса, пока в списке ещё нет видимых сообщений. */
  const selectedHadVisibleThreadRef = useRef(false);

  const loadThreads = async () => {
    try {
      setError('');
      const data = await getChatThreads();
      setAllThreads(data);
    } catch (e) {
      setError(e.message || 'Не удалось загрузить чаты');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadThreads();
    const id = setInterval(loadThreads, POLL_INTERVAL);
    return () => clearInterval(id);
  }, []);

  const threadsWithMessages = useMemo(
    () => allThreads.filter((t) => t.lastMessageAt != null),
    [allThreads]
  );

  const visibleThreads = useMemo(() => {
    const q = threadSearch.trim().toLowerCase();
    if (!q) return threadsWithMessages;
    return threadsWithMessages.filter((t) => {
      const hay = `${t.courseTitle ?? ''} ${t.instructorName ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [threadsWithMessages, threadSearch]);

  useEffect(() => {
    if (!selected) {
      selectedHadVisibleThreadRef.current = false;
      return;
    }
    const visibleInList = allThreads.some(
      (t) =>
        t.lastMessageAt != null &&
        t.userId === selected.userId &&
        t.courseId === selected.courseId
    );
    if (visibleInList) selectedHadVisibleThreadRef.current = true;
    else if (selectedHadVisibleThreadRef.current) {
      setSelected(null);
      selectedHadVisibleThreadRef.current = false;
    }
  }, [allThreads, selected]);

  useEffect(() => {
    const state = location.state;
    if (state?.openCourseId && user) {
      const existing = allThreads.find(
        (t) => t.courseId === state.openCourseId && t.userId === user.id
      );
      if (existing) {
        setSelected(existing);
      } else {
        setSelected({
          userId: user.id,
          courseId: state.openCourseId,
          courseTitle: state.courseTitle || 'Курс',
          instructorName: state.instructorName || 'Инструктор',
        });
      }
      navigate('/dashboard/chat', { replace: true, state: {} });
    }
  }, [location.state?.openCourseId, user?.id, allThreads]);

  const handleSelectThread = async (t) => {
    setSelected(t);
    if (t?.hasUnread) {
      try {
        await markChatRead(t.userId, t.courseId);
        setAllThreads((prev) =>
          prev.map((th) =>
            th.userId === t.userId && th.courseId === t.courseId
              ? { ...th, hasUnread: false }
              : th
          )
        );
      } catch { /* ignore */ }
    }
  };

  const loadMessages = async () => {
    if (!selected) return;
    try {
      const data = await getChatMessages(selected.userId, selected.courseId);
      setMessages(data);
    } catch (e) {
      setError(e.message || 'Не удалось загрузить сообщения');
    }
  };

  useEffect(() => {
    if (!selected) {
      setMessages([]);
      return;
    }
    loadMessages();
    const id = setInterval(loadMessages, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [selected?.userId, selected?.courseId]);

  useEffect(() => {
    if (selected && messages.length > 0) {
      markChatRead(selected.userId, selected.courseId).catch(() => {});
      setAllThreads((prev) =>
        prev.map((th) =>
          th.userId === selected.userId && th.courseId === selected.courseId
            ? { ...th, hasUnread: false }
            : th
        )
      );
    }
  }, [selected?.userId, selected?.courseId, messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!selected || !input.trim() || sending) return;
    setSending(true);
    try {
      await sendChatMessage({
        userId: selected.userId,
        courseId: selected.courseId,
        text: input.trim(),
      });
      setInput('');
      await loadMessages();
      await loadThreads();
    } catch (e) {
      setError(e.message || 'Не удалось отправить');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={6}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Чат с инструктором</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {threadsWithMessages.length === 0 && !selected ? (
        <Typography color="text.secondary">
          Нет доступных чатов. Запишитесь на курс и дождитесь одобрения заявки. Или нажмите «Чат с инструктором» в карточке курса.
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', gap: 2, height: 520 }}>
          <Paper sx={{ width: 280, overflow: 'hidden', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 1, flexShrink: 0, borderBottom: 1, borderColor: 'divider' }}>
              <TextField
                size="small"
                fullWidth
                placeholder="Поиск по имени инструктора или курсу"
                value={threadSearch}
                onChange={(e) => setThreadSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                }}
                aria-label="Поиск переписки по инструктору или курсу"
              />
            </Box>
            <List dense sx={{ flex: 1, overflow: 'auto' }}>
              {visibleThreads.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 1 }}>
                  {threadsWithMessages.length === 0
                    ? 'Нет чатов с сообщениями'
                    : 'Совпадений нет — попробуйте другую строку поиска'}
                </Typography>
              ) : (
              visibleThreads.map((t) => (
                <ListItemButton
                  key={`${t.userId}-${t.courseId}`}
                  selected={selected?.userId === t.userId && selected?.courseId === t.courseId}
                  onClick={() => handleSelectThread(t)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                    {t.hasUnread && (
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: '#c62828',
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <ListItemText
                      primary={t.courseTitle}
                      secondary={t.instructorName}
                      primaryTypographyProps={{ fontWeight: 600 }}
                    />
                  </Box>
                </ListItemButton>
              ))
              )}
            </List>
          </Paper>

          <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            {selected ? (
              <>
                <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {selected.courseTitle}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Инструктор: {selected.instructorName}
                  </Typography>
                </Box>
                <Box sx={{ flex: 1, overflow: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {messages.map((m) => (
                    <ChatMessageBubble
                      key={m.id}
                      m={m}
                      onUpdated={() => { loadMessages(); loadThreads(); }}
                      onDeleted={() => { loadMessages(); loadThreads(); }}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </Box>
                <Divider />
                <Box sx={{ p: 2, display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Сообщение..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                  />
                  <Button
                    variant="contained"
                    endIcon={<SendIcon />}
                    onClick={handleSend}
                    disabled={!input.trim() || sending}
                  >
                    Отправить
                  </Button>
                </Box>
              </>
            ) : (
              <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary' }}>
                {threadsWithMessages.length === 0 ? 'Выберите чат в карточке курса' : 'Выберите чат'}
              </Box>
            )}
          </Paper>
        </Box>
      )}
    </Box>
  );
}
