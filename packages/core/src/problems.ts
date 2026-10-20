import type {
  ToolCatalog,
  ProblemCatalog,
  Coordinates,
  Check,
  CheckTree,
  Evidence,
  EvidenceStatus,
  AnnotatedCheck,
  ReadinessNode,
  CheckStatus,
  ReadinessFocus,
} from './types.js';
import rawTools from '../data/tools.json' with { type: 'json' };
const tools = rawTools as ToolCatalog;
export const toolCatalog = tools;
import rawCatalog from '../data/problems.json' with { type: 'json' };
const catalog = rawCatalog as ProblemCatalog;
export const problemCatalog = catalog;
export function matchProblems(coordinates: Coordinates) {
  for (const dimension of catalog.dimensions) {
    if (!dimension.options.some((o) => o.id === coordinates[dimension.id]))
      throw new Error(`请补全：${dimension.label}`);
  }
  return catalog.solutions
    .filter((s) =>
      Object.entries(s.match).every(([key, allowed]) =>
        allowed.includes(coordinates[key] ?? ''),
      ),
    )
    .map((s) => ({
      ...s,
      missing: Object.entries(s.requirements)
        .filter(([key, allowed]) => !allowed.includes(coordinates[key] ?? ''))
        .map(([key, allowed]) => ({
          dimension: key,
          expected: allowed,
          actual: coordinates[key] ?? 'unknown',
        })),
    }))
    .map((s) => ({
      ...s,
      status: s.missing.length ? 'conditional' : 'matched',
    }))
    .sort((a, b) => a.missing.length - b.missing.length);
}

export function evaluateReadiness(
  solutionId: string,
  evidence: Evidence = {},
  coordinates?: Coordinates,
) {
  const solution = catalog.solutions.find((s) => s.id === solutionId);
  if (!solution) throw new Error('未知方案');
  const tool = tools.tools.find((t) => t.id === solution.tool);
  if (!tool) throw new Error('方案缺少工具模型');
  const annotate = (item: Check): AnnotatedCheck => {
    const status = evidence[item.id];
    return {
      ...item,
      status: status === 'pass' || status === 'fail' ? status : 'unknown',
    };
  };
  const preconditions = [...tool.preconditions, ...solution.preconditions].map(
    annotate,
  );
  const acceptance = solution.acceptance.map(annotate);
  const compatible = coordinates
    ? matchProblems(coordinates).find((s) => s.id === solutionId)?.status ===
      'matched'
    : false;
  const byId = new Map(preconditions.map((c) => [c.id, c]));
  const focus: { current: ReadinessFocus | null } = { current: null };
  function build(node: CheckTree, unlocked = true): ReadinessNode {
    const items = node.checks.map((id) => {
      if (!byId.has(id)) throw new Error(`检查树引用未知条件：${id}`);
      return { ...byId.get(id)!, locked: !unlocked };
    });
    const ownPass =
      node.id === 'goal' ? compatible : items.every((c) => c.status === 'pass');
    const ownFail =
      node.id === 'goal'
        ? Boolean(coordinates && !compatible)
        : items.some((c) => c.status === 'fail');
    const status: CheckStatus = !unlocked
      ? 'locked'
      : ownFail
        ? 'blocked'
        : ownPass
          ? 'passed'
          : 'pending';
    if (unlocked && !ownPass && !focus.current)
      focus.current = { id: node.id, title: node.title, status };
    const children = node.children.map((n) => build(n, unlocked && ownPass));
    return { ...node, items, status, children };
  }
  const tree = build(solution.checkTree);
  function allPassed(node: ReadinessNode): boolean {
    return node.status === 'passed' && node.children.every(allPassed);
  }
  const ready = allPassed(tree);
  const current = focus.current;
  return {
    preconditions,
    acceptance,
    tree,
    current,
    ready,
    status:
      current?.status === 'blocked' ? 'blocked' : ready ? 'ready' : 'pending',
    complete: ready && acceptance.every((c) => c.status === 'pass'),
  };
}

export function updateReadinessEvidence(
  solutionId: string,
  evidence: Evidence,
  checkId: string,
  status: EvidenceStatus,
) {
  if (!['pass', 'fail', 'unknown'].includes(status))
    throw new Error('无效检查状态');
  const solution = catalog.solutions.find((s) => s.id === solutionId);
  if (!solution) throw new Error('未知方案');
  const { acceptance } = solution;
  const next = { ...evidence };
  let found = false;
  function clear(node: CheckTree) {
    for (const id of node.checks) delete next[id];
    for (const child of node.children) clear(child);
  }
  function visit(node: CheckTree) {
    if (node.checks.includes(checkId)) {
      found = true;
      if (next[checkId] !== status) {
        for (const child of node.children) clear(child);
        for (const item of acceptance) delete next[item.id];
      }
    }
    for (const child of node.children) visit(child);
  }
  visit(solution.checkTree);
  if (!found && !solution.acceptance.some((c) => c.id === checkId))
    throw new Error('未知检查项');
  next[checkId] = status;
  return next;
}
