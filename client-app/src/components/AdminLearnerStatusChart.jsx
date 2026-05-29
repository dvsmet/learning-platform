import { useMemo } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  Sector,
} from 'recharts';

/** Без отдельной «активной» обводки: стандартный activeShape рисует тёмный контур при клике. */
function ActiveSectorShape(props) {
  const {
    cx,
    cy,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
  } = props;
  return (
    <Sector
      cx={cx}
      cy={cy}
      innerRadius={innerRadius}
      outerRadius={outerRadius}
      startAngle={startAngle}
      endAngle={endAngle}
      fill={fill}
      stroke="none"
    />
  );
}

const COLORS = {
  high: '#2e7d32',
  mid: '#1976d2',
  low: '#ed6c02',
  none: '#9e9e9e',
};

function useLearnerProgressStats(learners) {
  return useMemo(() => {
    let high = 0;
    let mid = 0;
    let low = 0;
    let none = 0;
    for (const l of learners) {
      const p = Number(l.avgProgressPercent) || 0;
      if (p >= 70) high += 1;
      else if (p >= 20) mid += 1;
      else if (p > 0) low += 1;
      else none += 1;
    }
    const chartData = [
      { name: 'Высокий прогресс (≥70%)', value: high, key: 'high' },
      { name: 'Активное обучение (20–69%)', value: mid, key: 'mid' },
      { name: 'Низкий прогресс (1–19%)', value: low, key: 'low' },
      { name: 'Без прохождения уроков (0%)', value: none, key: 'none' },
    ].filter((x) => x.value > 0);
    return { chartData, total: learners.length };
  }, [learners]);
}

/**
 * @param {{ learners: unknown[], periodLabel?: string | null }} props
 */
export default function AdminLearnerStatusChart({ learners, periodLabel }) {
  const { chartData, total } = useLearnerProgressStats(learners);

  if (total === 0) return null;

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        Обучающиеся: средний прогресс по урокам
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: periodLabel ? 0.5 : 2 }}>
        Всего в выборке: {total}.
      </Typography>
      {periodLabel ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Период: {periodLabel}
        </Typography>
      ) : null}

      <Box
        sx={{
          width: '100%',
          height: 300,
          '& .recharts-pie-sector:focus': { outline: 'none' },
          '& .recharts-pie-sector:focus-visible': { outline: 'none' },
        }}
      >
        {chartData.length === 0 ? (
          <Typography color="text.secondary">Нет данных для диаграммы.</Typography>
        ) : (
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={95}
                paddingAngle={2}
                activeShape={ActiveSectorShape}
                label={({ value, percent }) =>
                  `${value} чел. (${((percent ?? 0) * 100).toFixed(0)}%)`
                }
              >
                {chartData.map((entry) => (
                  <Cell key={entry.key} fill={COLORS[entry.key]} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, _name, props) => [`${value} чел.`, props.payload.name]}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </Box>
    </Paper>
  );
}
