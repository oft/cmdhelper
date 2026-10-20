import type {
  Command,
  ToolCatalog,
  ProblemCatalog,
  ProblemModel,
} from '@cmdhelper/schema';
export type { Command, ToolCatalog, ProblemCatalog, ProblemModel };
export type Field = Command['fields'][number];
export type Scenario = Command['scenarios'][number];
export type Values = Record<string, string | boolean>;
export type Shell = 'posix' | 'powershell';
export type Coordinates = Record<string, string>;
export type Solution = ProblemCatalog['solutions'][number];
export type Check = Solution['preconditions'][number];
export type CheckTree = Solution['checkTree'];
export type EvidenceStatus = 'pass' | 'fail' | 'unknown';
export type Evidence = Record<string, EvidenceStatus>;
export type CheckStatus = 'locked' | 'blocked' | 'passed' | 'pending';
export type AnnotatedCheck = Check & {
  status: EvidenceStatus;
  locked?: boolean;
};
export type ReadinessNode = Omit<CheckTree, 'children'> & {
  items: AnnotatedCheck[];
  status: CheckStatus;
  children: ReadinessNode[];
};
export type ResourceStatus = 'eligible' | 'pending' | 'excluded';
export interface ResourceAssessment {
  id: string;
  status: ResourceStatus;
  blocked: string[];
  missing: string[];
  reasons: string[];
  order: number;
}

export interface ReadinessFocus {
  id: string;
  title: string;
  status: CheckStatus;
}
