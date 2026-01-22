export type Align = "left" | "center" | "right";

export type Placement = {
  placementId: string;
  fieldKey: string;
  label?: string;
  pageIndex: number;
  rect: { x: number; y: number; w: number; h: number }; // normalized 0..1
  style?: { fontSize?: number; align?: Align; multiline?: boolean; lineHeight?: number };
};

export type MasterField = {
  key: string;
  type: string;
  required: boolean;
  description: string;
  validation_rules: string[];
};

export type TemplateDoc = {
  _id: string;
  name: string;
  pageCount: number;
  placements: Placement[];
  file: { storagePath: string; originalName: string };
  createdAt?: string;
  updatedAt?: string;
};
