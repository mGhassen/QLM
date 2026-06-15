import { redirect } from '@tanstack/react-router';

import type { SupabaseClient } from '@supabase/supabase-js';

import { z } from 'zod';

import { Database } from '@guepard/supabase/database';

import { UpdateOrganizationNameSchema } from '../../schema';

export const updateOrganizationName = async (params: {
  client: SupabaseClient<Database>;
  data: z.infer<typeof UpdateOrganizationNameSchema>;
}) => {
  const { payload } = UpdateOrganizationNameSchema.parse(params.data);
  const { name, slug, path } = payload;

  const { error, data } = await params.client
    .from('organizations')
    .update({
      name,
      slug,
    })
    .match({
      slug,
    })
    .select('slug')
    .single();

  if (error) {
    return {
      success: false,
    };
  }

  const newSlug = data.slug;

  if (newSlug) {
    const nextPath = path.replace('[organization]', newSlug);

    return redirect({ href: nextPath });
  }

  return { success: true };
};
