import { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, List, ListItemButton, ListItemText, Paper,
  TextField, Button, CircularProgress, Alert, Divider,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { getChatThreads, getChatMessages, sendChatMessage, markChatRead } from '../../api/chat';
import ChatMessageBubble from '../../components/ChatMessageBubble';

const POLL_INTERVAL = 4000;

export default function ChatTab() {
  const [threads, setThreads] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const loadThreads = async () => {
    try {
      setError('');
      const data = await getChatThreads();
      setThreads(data);
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

  const handleSelectThread = async (t) => {
    setSelected(t);
    if (t?.hasUnread) {
      try {
        await markChatRead(t.userId, t.courseId);
        setThreads((prev) =>
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
      setThreads((prev) =>
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
      <Typography variant="h5" gutterBottom>Чаты с сотрудниками</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {threads.length === 0 ? (
        <Typography color="text.secondary">
          Нет чатов. Сотрудники появятся здесь после одобрения заявок на ваши курсы.
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', gap: 2, height: 520 }}>
          <Paper sx={{ width: 280, overflow: 'auto', flexShrink: 0 }}>
            <List dense>
              {threads.map((t) => (
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
                      primary={t.userName}
                      secondary={`${t.courseTitle}`}
                      primaryTypographyProps={{ fontWeight: 600 }}
                    />
                  </Box>
                </ListItemButton>
              ))}
            </List>
          </Paper>

          <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            {selected ? (
              <>
                <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {selected.userName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Курс: {selected.courseTitle}
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
                Выберите чат
              </Box>
            )}
          </Paper>
        </Box>
      )}
    </Box>
  );
}
