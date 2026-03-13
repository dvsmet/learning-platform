import { useState } from 'react';
import {
  Box, Typography, Menu, MenuItem, TextField, Button,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { updateChatMessage, deleteChatMessage } from '../api/chat';

function formatChatTime(sentAt) {
  if (!sentAt) return '';
  const s = String(sentAt);
  const asUtc = /Z$|[\+\-]\d{2}:?\d{2}$/.test(s) ? s : s + 'Z';
  return new Date(asUtc).toLocaleString('ru-RU');
}

export default function ChatMessageBubble({ m, onUpdated, onDeleted }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(m.text);
  const [saving, setSaving] = useState(false);

  const handleContextMenu = (e) => {
    e.preventDefault();
    if (editing) return;
    setMenuPosition({ x: e.clientX, y: e.clientY });
    setAnchorEl(e.currentTarget);
  };

  const handleEdit = () => {
    setEditing(true);
    setEditText(m.text);
    setAnchorEl(null);
  };

  const handleSaveEdit = async () => {
    if (editText.trim() === m.text) {
      setEditing(false);
      return;
    }
    if (!editText.trim()) return;
    setSaving(true);
    try {
      await updateChatMessage(m.id, editText.trim());
      onUpdated?.();
      setEditing(false);
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setEditText(m.text);
  };

  const handleDelete = async (forSelf) => {
    setAnchorEl(null);
    try {
      await deleteChatMessage(m.id, forSelf);
      onDeleted?.();
    } catch {
      /* ignore */
    }
  };

  return (
    <Box
      onContextMenu={handleContextMenu}
      sx={{
        alignSelf: m.isFromMe ? 'flex-end' : 'flex-start',
        maxWidth: '75%',
        bgcolor: m.isFromMe ? 'primary.main' : 'grey.200',
        color: m.isFromMe ? 'primary.contrastText' : 'text.primary',
        px: 2,
        py: 1,
        borderRadius: 2,
        position: 'relative',
        cursor: 'context-menu',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="caption" display="block" sx={{ opacity: 0.9 }}>
            {m.senderName} · {formatChatTime(m.sentAt)}
          </Typography>
          {editing ? (
            <Box sx={{ mt: 0.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <TextField
                size="small"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                multiline
                maxRows={4}
                fullWidth
                autoFocus
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'background.paper',
                    color: 'text.primary',
                  },
                }}
              />
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 0.5 }}>
                <Button size="small" variant="contained" onClick={handleCancelEdit} disabled={saving}>
                  Отмена
                </Button>
                <Button size="small" variant="contained" onClick={handleSaveEdit} disabled={saving || !editText.trim()}>
                  Сохранить
                </Button>
              </Box>
            </Box>
          ) : (
            <Typography variant="body2">{m.text}</Typography>
          )}
        </Box>
      </Box>
      <Menu
        anchorReference="anchorPosition"
        anchorPosition={anchorEl ? { top: menuPosition.y, left: menuPosition.x } : undefined}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        {m.isFromMe && (
          <>
            <MenuItem onClick={handleEdit}>
              <EditIcon fontSize="small" sx={{ mr: 1 }} /> Редактировать
            </MenuItem>
            <MenuItem onClick={() => handleDelete(false)}>
              <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Удалить у обоих
            </MenuItem>
          </>
        )}
        <MenuItem onClick={() => handleDelete(true)}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Удалить у себя
        </MenuItem>
      </Menu>
    </Box>
  );
}
