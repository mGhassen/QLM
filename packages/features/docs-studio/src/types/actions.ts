export interface DocStudioActions {
  createNewDocAction: () => Promise<{ slug: string }>;
  deleteDocAction: (slug: string) => Promise<void>;
  importDocAction: (formData: FormData) => Promise<{ slug: string; title: string }>;
}
