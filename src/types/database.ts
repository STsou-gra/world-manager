export type World = { 
  id: string; 
  name: string; 
  description: string; 
  stats_schema: string[];
  organizations?: Organization[];
  character_count?: number;
};

export type Organization = { 
  id: string; 
  world_id: string | null; 
  name: string; 
  description: string; 
  stats_schema: string[];
  worlds?: { name: string };
  member_count?: number;
};

export type Character = {
  id: string;
  name: string;
  gender: string;
  description: string;
  stats: Record<string, number>;
  worlds?: World[];
  organizations?: Organization[];
};