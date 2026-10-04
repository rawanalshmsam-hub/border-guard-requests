import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, InputAdornment, TextField, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import OptionCard from '../../components/OptionCard';
import PageHeader from '../../components/PageHeader';
import { getCategoryIcon } from '../../components/categoryIcons';

const GRID = { display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } };

function typeHint(t) {
  const hints = [];
  if (t.requires_dates) hints.push('يتطلب تحديد التاريخ');
  if (t.requires_attachment) hints.push('يتطلب مرفق');
  return hints.join(' • ') || 'نموذج مختصر';
}

function Empty({ text }) {
  return <Typography color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>{text}</Typography>;
}

/** Screen 1: ② categories → their types. ③ search filters types locally (no API call). */
export default function CategoryPicker({ categories, category, onSelectCategory, onSelectType }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const q = query.trim();

  let content;
  if (q) {
    const matches = categories.flatMap((c) =>
      c.types.filter((t) => t.name.includes(q)).map((t) => ({ t, c })));
    content = matches.length ? (
      <Box sx={GRID}>
        {matches.map(({ t, c }) => (
          <OptionCard key={t.id} icon={getCategoryIcon(c.icon)} title={t.name} subtitle={c.name}
                      onClick={() => onSelectType(t, c)} />
        ))}
      </Box>
    ) : <Empty text="لا توجد نتائج مطابقة" />;
  } else if (category) {
    content = category.types.length ? (
      <Box sx={GRID}>
        {category.types.map((t) => (
          <OptionCard key={t.id} icon={getCategoryIcon(category.icon)} title={t.name} subtitle={typeHint(t)}
                      onClick={() => onSelectType(t, category)} />
        ))}
      </Box>
    ) : <Empty text="لا توجد أنواع متاحة في هذا التصنيف حالياً" />;
  } else {
    content = (
      <Box sx={GRID}>
        {categories.map((c) => (
          <OptionCard key={c.id} icon={getCategoryIcon(c.icon)} title={c.name} subtitle={`${c.types_count} أنواع`}
                      onClick={() => onSelectCategory(c)} />
        ))}
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title={category ? category.name : 'تقديم طلب جديد'}
        subtitle={category ? 'اختر نوع الطلب' : 'اختر التصنيف ثم نوع الطلب'}
        onBack={() => (category ? onSelectCategory(null) : navigate('/'))}
      />
      <TextField
        fullWidth placeholder="ابحث عن نوع الطلب..." value={query} onChange={(e) => setQuery(e.target.value)}
        sx={{ mb: 2.5, '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
        slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
      />
      {content}
    </Box>
  );
}