import { Box, Typography } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

const STYLE = {
  done: { bg: '#1f8a5b', fg: '#fff', ring: '#1f8a5b' },
  current: { bg: '#d68a1f', fg: '#fff', ring: '#f3d19c' },
  waiting: { bg: '#eef1ef', fg: '#8a978f', ring: '#dfe5e2' },
  rejected: { bg: '#d64545', fg: '#fff', ring: '#d64545' },
  returned: { bg: '#d68a1f', fg: '#fff', ring: '#d68a1f' },
  cancelled: { bg: '#eef1ef', fg: '#8a978f', ring: '#dfe5e2' },
};
const REACHED = ['done', 'current', 'rejected', 'returned'];

function DotContent({ state, index }) {
  if (state === 'done') return <CheckIcon sx={{ fontSize: 16 }} />;
  if (state === 'rejected' || state === 'cancelled') return <CloseIcon sx={{ fontSize: 16 }} />;
  if (state === 'returned') return <span>!</span>;
  if (state === 'current') return <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#fff' }} />;
  return <span>{index + 1}</span>;
}

/** Mini approval path: one dot per step, built from the API's approval_path */
export default function ApprovalPath({ steps }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
      {steps.map((step, i) => {
        const s = STYLE[step.state] || STYLE.waiting;
        return (
          <Box key={i} sx={{
            flex: 1, minWidth: 0, position: 'relative', textAlign: 'center',
            // connecting line to the previous dot
            ...(i > 0 && {
              '&::before': {
                content: '""', position: 'absolute', top: 14, left: '-50%', width: '100%', height: 2,
                bgcolor: REACHED.includes(step.state) ? '#1f8a5b' : '#dfe5e2',
              },
            }),
          }}>
            <Box sx={{
              width: 30, height: 30, mx: 'auto', borderRadius: '50%', position: 'relative', zIndex: 1,
              display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700,
              bgcolor: s.bg, color: s.fg, border: `3px solid ${s.ring}`,
            }}>
              <DotContent state={step.state} index={i} />
            </Box>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', mt: 0.75, px: 0.5 }}>
              {step.label}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}