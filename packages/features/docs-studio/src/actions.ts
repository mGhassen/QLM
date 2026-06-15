import { docsPaths } from './paths';

export async function createNewDocAction() {
  const res = await fetch(docsPaths.api.list, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'New Doc' }),
  });

  if (!res.ok) {
    throw new Error('Failed to create document');
  }

  return (await res.json()) as { slug: string };
}

export async function deleteDocAction(slug: string) {
  const res = await fetch(docsPaths.api.doc(slug), { method: 'DELETE' });
  if (!res.ok) {
    throw new Error('Failed to delete document');
  }
}

export async function importDocAction(formData: FormData) {
  const res = await fetch(docsPaths.api.import, {
    method: 'POST',
    body: formData,
  });

  const data = (await res.json()) as {
    slug?: string;
    title?: string;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.error ?? 'Failed to import document');
  }

  return { slug: data.slug!, title: data.title ?? 'Imported document' };
}
