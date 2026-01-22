export interface NodeItem {
  _id: string;

  // 🔹 Names
  name: string;
  second_name?: string;

  // 🔹 Icon / Emoji
  icon?: string;

  // 🔹 Description
  description?: string;

  // 🔹 Parent / Tree Structure
  parent: NodeItem;
  children?: NodeItem[]; // Recursive (tree)
  depth: number;

  // 🔹 Links
  youtube_url?: string;
  instagram_url?: string;
  tiktok_url?: string;
  facebook_url?: string;
  linkedin_url?: string;
  links?: string[]; // multiple links

  // 🔹 Media
  media?: string[]; // images, videos, files

  // 🔹 Meta
  status?: "pending" | "in-progress" | "completed" | "archived";
  is_active: boolean;
  sort_order?: number;

  // 🔹 Custom Dynamic Fields (JSON)
  custom_fields?: Record<string, any>;
  date: string;

  // 🔹 Timestamps
  created_at?: string;
  updated_at?: string;
}
