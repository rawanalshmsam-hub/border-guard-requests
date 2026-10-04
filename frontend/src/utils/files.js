import api from '../api/client';

// Same limits as the server (settings.py)
export const ALLOWED_EXT = ['pdf', 'jpg', 'jpeg', 'png'];
export const MAX_MB = 5;
export const MAX_FILES = 5;
export const ACCEPT = '.pdf,.jpg,.jpeg,.png';

/** Returns an error message, or '' if the new files are acceptable. */
export function checkFiles(current, incoming) {
  if (current.length + incoming.length > MAX_FILES) return `الحد الأقصى للمرفقات ${MAX_FILES} ملفات`;
  for (const f of incoming) {
    const ext = f.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) return `نوع الملف غير مسموح: ${f.name} (المسموح PDF, JPG, PNG)`;
    if (f.size > MAX_MB * 1024 * 1024) return `حجم الملف أكبر من ${MAX_MB} ميجابايت: ${f.name}`;
  }
  return '';
}

/**
 * Open (preview) or download an attachment through the PROTECTED API.
 * Files are never public: we fetch them with the login token, then show them from memory (blob).
 */
export async function openAttachment(attachment, inline) {
  // open the tab first (synchronously), otherwise the browser's popup blocker may stop it
  const previewWindow = inline ? window.open('', '_blank') : null;
  try {
    const res = await api.get(`/requests/attachments/${attachment.id}/download/`, {
      params: inline ? { inline: 1 } : {},
      responseType: 'blob',
    });
    const url = URL.createObjectURL(res.data);
    if (previewWindow) {
      previewWindow.location.href = url;
    } else {
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.file_name;
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (err) {
    if (previewWindow) previewWindow.close();
    throw err;
  }
}