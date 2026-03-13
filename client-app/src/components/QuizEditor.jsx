import { useState } from 'react';
import {
  Box, TextField, Button, IconButton, Radio, Typography, Paper, Stack, Divider,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

function OptionRow({ opt, qIdx, oIdx, selected, onChange, onRemove, canRemove }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
      <Radio
        checked={selected}
        onChange={() => onChange(qIdx, oIdx)}
        size="small"
        title="Правильный ответ"
      />
      <TextField
        size="small"
        placeholder="Вариант ответа"
        value={opt.optionText}
        onChange={(e) => onChange(qIdx, oIdx, e.target.value)}
        required
        fullWidth
      />
      {canRemove && (
        <IconButton size="small" onClick={() => onRemove(qIdx, oIdx)}><DeleteIcon fontSize="small" /></IconButton>
      )}
    </Stack>
  );
}

export default function QuizEditor({ questions, setQuestions }) {
  const addQuestion = () => {
    setQuestions([...questions, {
      questionText: '',
      options: [
        { optionText: '', isCorrect: true },
        { optionText: '', isCorrect: false },
        { optionText: '', isCorrect: false },
        { optionText: '', isCorrect: false },
      ],
    }]);
  };

  const removeQuestion = (qIdx) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, i) => i !== qIdx));
  };

  const updateQuestionText = (qIdx, text) => {
    const copy = [...questions];
    copy[qIdx] = { ...copy[qIdx], questionText: text };
    setQuestions(copy);
  };

  const handleOptionChange = (qIdx, oIdx, value) => {
    const copy = [...questions];
    if (value === undefined) {
      // radio select
      copy[qIdx] = {
        ...copy[qIdx],
        options: copy[qIdx].options.map((o, i) => ({ ...o, isCorrect: i === oIdx })),
      };
    } else {
      copy[qIdx] = {
        ...copy[qIdx],
        options: copy[qIdx].options.map((o, i) => i === oIdx ? { ...o, optionText: value } : o),
      };
    }
    setQuestions(copy);
  };

  const addOption = (qIdx) => {
    const copy = [...questions];
    copy[qIdx] = { ...copy[qIdx], options: [...copy[qIdx].options, { optionText: '', isCorrect: false }] };
    setQuestions(copy);
  };

  const removeOption = (qIdx, oIdx) => {
    const copy = [...questions];
    if (copy[qIdx].options.length <= 2) return;
    copy[qIdx] = { ...copy[qIdx], options: copy[qIdx].options.filter((_, i) => i !== oIdx) };
    setQuestions(copy);
  };

  return (
    <Box>
      {questions.map((q, qIdx) => (
        <Paper key={qIdx} variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="subtitle2">Вопрос {qIdx + 1}</Typography>
            {questions.length > 1 && (
              <Button size="small" color="error" onClick={() => removeQuestion(qIdx)}>Удалить вопрос</Button>
            )}
          </Stack>
          <TextField
            size="small"
            placeholder="Текст вопроса"
            value={q.questionText}
            onChange={(e) => updateQuestionText(qIdx, e.target.value)}
            required
            fullWidth
            sx={{ mb: 1.5 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            Выберите правильный ответ:
          </Typography>
          {q.options.map((opt, oIdx) => (
            <OptionRow
              key={oIdx}
              opt={opt}
              qIdx={qIdx}
              oIdx={oIdx}
              selected={opt.isCorrect}
              onChange={handleOptionChange}
              onRemove={removeOption}
              canRemove={q.options.length > 2}
            />
          ))}
          <Button size="small" startIcon={<AddIcon />} onClick={() => addOption(qIdx)}>
            Добавить вариант
          </Button>
        </Paper>
      ))}
      <Button variant="outlined" startIcon={<AddIcon />} onClick={addQuestion} sx={{ mt: 1 }}>
        Добавить вопрос
      </Button>
    </Box>
  );
}
