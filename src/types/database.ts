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

export type CharacterRelation = {
  id: string;
  source_character_id: string;
  target_character_id: string;
  relation_name: string;
  target_character?: Character;
};

// 組織 → 組織の関係
export type OrganizationRelation = {
  id: string;
  source_org_id: string;
  target_org_id: string;
  relation_name: string;
};

// キャラ → 組織の関係（所属とは別）
export type CharacterOrgRelation = {
  id: string;
  character_id: string;
  org_id: string;
  relation_name: string;
};

// 相関図の配置（世界観ごと）
export type RelationLayout = {
  world_id: string;
  positions: Record<string, { x: number; y: number }>;
  org_sizes: Record<string, { width: number; height: number }>;
};

export type CharacterOrganization = {
  character_id: string;
  org_id: string;
  relation_name: string | null;
  organizations?: Organization;
};

export type Character = {
  id: string;
  name: string;
  gender: string;
  description: string;
  stats?: Record<string, number>;
  stat_notes?: Record<string, string>;
  worlds?: World[];
  organizations?: Organization[];
  character_organizations?: CharacterOrganization[];
  relations?: CharacterRelation[];
};