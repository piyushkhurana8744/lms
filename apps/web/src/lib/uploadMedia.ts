/**
 * Reusable utility for uploading media files.
 * Posts to Next.js API Route (/api/v1/media/upload) which automatically attaches
 * the HttpOnly auth cookie and forwards the stream to the Express API with extended timeouts.
 */
export async function uploadMediaFile(file: File): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/v1/media/upload', {
    method: 'POST',
    body: formData
  });

  let json: any = {};
  try {
    json = await res.json();
  } catch {
    throw new Error('Server returned invalid response during upload');
  }

  if (!res.ok) {
    throw new Error(json.error?.message || json.message || 'Failed to upload media file');
  }

  return json.data;
}
