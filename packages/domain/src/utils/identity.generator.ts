import { v4 as uuidv4 } from 'uuid';
import { shortenId } from './shorten-id';

export interface IIdentity {
  id: string;
  slug: string;
}

export function generateIdentity(): IIdentity {
  const id = uuidv4();
  const slug = shortenId(id);

  return {
    id,
    slug,
  };
}
