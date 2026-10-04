import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress } from '@mui/material';
import useApi from '../../hooks/useApi';
import CategoryPicker from './CategoryPicker';
import RequestForm from './RequestForm';
import SubmitSuccess from './SubmitSuccess';

/** New request: ?category=ID shows its types, ?type=ID shows the form. API 4.1 loads everything once. */
export default function NewRequestPage() {
  const { data, loading, error, reload } = useApi('/requests/types/');
  const [params, setParams] = useSearchParams();
  const [submitted, setSubmitted] = useState(null);

  if (loading) {
    return <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress /></Box>;
  }
  if (error) {
    return <Alert severity="error" action={<Button onClick={reload}>إعادة المحاولة</Button>}>{error}</Alert>;
  }

  if (submitted) {
    return <SubmitSuccess request={submitted} onNew={() => { setSubmitted(null); setParams({}); }} />;
  }

  const categories = data.categories;
  const categoryId = Number(params.get('category')) || null;
  const typeId = Number(params.get('type')) || null;
  const category = categories.find((c) => c.id === categoryId) || null;

  let selected = null;
  for (const c of categories) {
    const t = c.types.find((x) => x.id === typeId);
    if (t) { selected = { type: t, category: c }; break; }
  }

  if (selected) {
    return (
      <RequestForm
        type={selected.type} category={selected.category} priorities={data.priorities}
        onBack={() => setParams({ category: String(selected.category.id) })}
        onSubmitted={setSubmitted}
      />
    );
  }

  return (
    <CategoryPicker
      categories={categories}
      category={category}
      onSelectCategory={(c) => setParams(c ? { category: String(c.id) } : {})}
      onSelectType={(t, c) => setParams({ category: String(c.id), type: String(t.id) })}
    />
  );
}