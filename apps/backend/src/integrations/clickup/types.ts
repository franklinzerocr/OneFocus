
export type ClickUpId = string;

export interface ClickUpTeam {
  id: ClickUpId;
  name: string;
}

export interface ClickUpSpace {
  id: ClickUpId;
  name: string;
  archived?: boolean;
}

export interface ClickUpFolder {
  id: ClickUpId;
  name: string;
  hidden?: boolean;
  archived?: boolean;
}

export interface ClickUpList {
  id: ClickUpId;
  name: string;
  archived?: boolean;
}

export interface ClickUpTask {
  id: ClickUpId;
  name: string;
  status: { status: string; type?: string } | string;
  tags?: Array<{ name: string }>;
  due_date?: string | null; // ms as string
  time_estimate?: number | null; // ms
}
