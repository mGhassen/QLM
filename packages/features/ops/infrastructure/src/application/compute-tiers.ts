export type ComputeTier = {
  id: string;
  nameKey: string;
  locked?: boolean;
  price?: string;
  memoryGb: string;
  dedicated: boolean;
  connections: number;
  maxDbGb: number;
};

export const COMPUTE_TIERS: ComputeTier[] = [
  { id: 'nano',   nameKey: 'nano',   locked: true,            memoryGb: '0.5', dedicated: false, connections: 60,  maxDbGb: 0.5  },
  { id: 'micro',  nameKey: 'micro',  price: '$0.01344 / hr',  memoryGb: '1',   dedicated: false, connections: 60,  maxDbGb: 10   },
  { id: 'small',  nameKey: 'small',  price: '$0.0206 / hr',   memoryGb: '2',   dedicated: false, connections: 90,  maxDbGb: 50   },
  { id: 'medium', nameKey: 'medium', price: '$0.0822 / hr',   memoryGb: '4',   dedicated: false, connections: 120, maxDbGb: 100  },
  { id: 'large',  nameKey: 'large',  price: '$0.1517 / hr',   memoryGb: '8',   dedicated: true,  connections: 160, maxDbGb: 200  },
  { id: 'xl',     nameKey: 'xl',     price: '$0.2877 / hr',   memoryGb: '16',  dedicated: true,  connections: 240, maxDbGb: 500  },
];

export const SELECTABLE_TIERS = COMPUTE_TIERS.filter((t) => !t.locked);
