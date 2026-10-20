import { z } from 'zod';

// 元数据只用于编辑器提示，不设置 Zod 默认值，不改变内容校验行为。
const hints: Record<string, [string, string, unknown[]?]> = {
  $schema:['校验模型','供 IDE 解析的 JSON Schema 地址；本地地址相对于当前 JSON 文件。'],
  id:['唯一标识','以英文字母开头，仅含字母、数字、下划线和连字符；在所属集合中唯一。',['scp','upload-file']],
  title:['标题','展示给用户的简短中文名称。'],
  label:['显示名称','字段、条件、实体或维度选项的用户可读名称。'],
  description:['详细说明','说明用途、适用范围和填写要求，不能仅为空白。'],
  flag:['命令选项','带 - 或 -- 的选项名；位置参数填写 null。',['-P','--output',null]],
  required:['必填要求','字段定义中使用布尔值；场景中列出额外必填的字段标识。'],
  kind:['类型','参数类型：text 文本、boolean 开关、port 端口、positive 正整数；条件类型：condition 环境条件、platform 平台、installation 安装。'],
  placeholder:['填写提示','输入框的示例文本，仅用于提示，不作为实际输入。'],
  assumptions:['示例前提','明确示例假设，避免把假设当成已检测的环境事实。'],
  values:['参数或坐标值','以字段或维度标识为键的映射；示例参数必须满足对应场景要求。'],
  before:['执行前','说明执行前的位置、内容或状态；示例可用多行目录树。'],
  after:['执行后','说明成功执行后的预计状态及变化，不代表已实际执行或验证。'],
  steps:['执行步骤','按先后顺序列出可操作的步骤。'],
  takeaways:['变化要点','列出示例中需要用户关注的变化与保留内容。'],
  example:['完整示例','包含前提、参数、步骤及执行前后对比的独立示例。'],
  defaults:['场景固定值','按字段标识设置场景固定值，覆盖用户输入；场景型命令还需 action 等于场景标识。'],
  labels:['场景名称覆盖','按字段标识覆盖显示名称；未提供的字段继承基础名称，允许空对象。',[{}]],
  placeholders:['场景提示覆盖','按字段标识覆盖填写提示；未提供时继承基础提示。'],
  fields:['参数字段','命令中定义字段对象；场景中用字段标识列表限定显示及校验范围。'],
  tokens:['固定命令片段','按顺序输出的固定命令片段，例如 Git 子命令；不要把用户输入放在这里。',[['pull','--ff-only']]],
  sourceSuffix:['源目录后缀','固定为 /.，用于传输目录内容而不额外嵌套源目录。',['/.']],
  result:['结果说明','列出成功执行前后的状态，并可提供完整示例。'],
  source:['信息来源','工具和方案中填写官方 HTTP(S) 文档地址；证据中填写 user 用户确认、inferred 推断或 observed 观察。'],
  notes:['使用提示','列出命令的限制、注意事项和适用条件。'],
  scenarios:['使用场景','用户先选择具体任务，再填写该场景需要的参数。'],
  scenarioOnly:['仅允许场景模式','为 true 时必须选择场景，不能使用自由参数模式。'],
  verify:['检查方法','说明用户如何确认条件成立；不能声称助手已自动检测。'],
  remedy:['补救措施','条件不满足时的可操作处理方法。'],
  scope:['检查范围','说明检查的是本机、远端、网络还是其他环境。'],
  preconditions:['前置条件','执行工具或方案前必须确认的条件。'],
  version:['格式版本','内容格式版本；目录使用整数 1，标准问题模型使用语义版本字符串。'],
  tools:['工具库','工具及其官方来源、前置条件和检查方法。'],
  options:['维度选项','该维度可选择的离散取值，至少两个且标识不重复。'],
  priority:['优先级','检查树中为非负整数，数值越小越优先；资源中为 unknown 未确认、quick 尽快完成、repeat 重复使用。'],
  reason:['原因','解释推荐该方案或优先检查此节点的理由。'],
  checks:['条件引用','引用工具及方案的条件标识；每个条件在检查树中恰好出现一次。'],
  children:['子节点','父节点通过后才继续检查；子节点的优先级数值必须大于父节点。'],
  tool:['工具引用','引用 tools/catalog.json 中已定义的工具标识。',['scp','git']],
  match:['匹配坐标','维度标识映射到允许值列表，用于筛选候选方案。'],
  requirements:['适用要求','维度标识映射到允许值列表；未确认时不能认定方案已经可用。'],
  tradeoffs:['取舍说明','列出投入、限制、副作用及其他需要权衡的因素。'],
  assistant:['命令助手入口','引用已有命令和场景；没有可用入口时填写 null。'],
  command:['命令引用','引用 commands 目录中定义的命令标识。',['scp','curl']],
  scenario:['场景引用','必须属于所引用命令的场景标识。',['upload-file','get']],
  acceptance:['验收要求','说明如何确认目标达成；方案中使用可检查条件，实例和路线中使用结果描述。'],
  checkTree:['分层检查树','根节点为 goal、优先级为 0；先确认目标，再递进检查可行性和环境等条件。'],
  dimensions:['问题维度','定义对象、空间、目标、时间、连接及质量等问题坐标。'],
  presets:['预设问题','提供标题和完整坐标，帮助用户快速选择标准问题。'],
  solutions:['解决方案','包含工具、适用条件、步骤、取舍、检查树及验收要求的方案库。'],
  type:['实体类型','device 设备、file 文件、directory 目录、short-text 短文本、video 视频、service 服务、repository 仓库。'],
  setup:['准备投入','unknown 未确认、none 不愿准备、small 少量准备、flexible 可灵活投入。'],
  install:['允许安装','unknown 未确认、no 不允许、yes 允许；允许安装不代表已经安装。'],
  configure:['允许配置','unknown 未确认、no 不允许、yes 允许修改配置。'],
  physical:['能够接触目标设备','unknown 未确认、yes 可以直接操作、no 无法直接操作。'],
  channel:['已有传递渠道','unknown 未确认、yes 有可用且获准使用的渠道、no 没有。'],
  toolReady:['工具已就绪','unknown 未确认、yes 已具备所需环境、no 尚未就绪。'],
  frequency:['使用频率','unknown 未确认、once 一次性任务、repeat 重复任务。'],
  cost:['资源成本','分别描述首次准备、每次使用和长期维护的投入。'],
  perUse:['单次投入','每次执行方案需要的时间或操作成本。'],
  maintenance:['维护投入','持续使用该方案需要的维护工作。'],
  aliases:['常见问法','用户可能使用的口语化问题表达，用于查询模板。'],
  entities:['问题实体','列出参与问题的设备、文件等实体及其稳定标识。'],
  goal:['目标状态','说明用户希望达到的状态；实例中使用列表。'],
  invariants:['保持不变的约束','执行过程中必须持续满足的限制，例如源文件不能删除。'],
  routes:['候选路线','解决同一标准问题的不同操作路径及其成本和验收要求。'],
  principles:['建模原则','说明标准问题模型的设计原则与判断边界。'],
  instanceContract:['实例字段约定','解释标准问题实例各字段的含义；这里保存说明文字。'],
  resourceFields:['资源维度定义','定义资源滑块与选项，必须与资源枚举保持一致。'],
  templates:['标准问题模板','把常见问题预定义为实体、目标、约束与候选路线。'],
  value:['事实值','字符串、有限数值、布尔值或 null；未确认事实可为 null。'],
  status:['证据状态','unknown 未确认、confirmed 已确认；已确认事实不能为 null，也不能仅来自推断。'],
  note:['证据备注','补充事实来源、观察过程或尚未确认的原因。'],
  templateId:['模板引用','引用标准问题模型中已定义的模板标识。'],
  utterance:['原始问题','保留用户原始的自然语言问题。',['我想发送一句话给另一台机器']],
  initialState:['初始状态','逐项描述执行前已知的状态。'],
  resources:['可投入资源','记录用户允许的投入和已有条件；unknown 不能视为允许或条件已满足。'],
  evidence:['事实证据','按事实标识记录值、来源、确认状态及可选备注。'],
  selectedRoute:['选中路线','必须属于所引用模板的路线；尚未选择时填写 null。'],
  slug:['文章标识','用于文件名及页面路由的唯一标识。',['ssh-scp-basics']],
  date:['发布日期','有效的 YYYY-MM-DD 日期。',['2026-10-20']],
  summary:['文章摘要','文章列表中显示的简短介绍。'],
  sections:['文章段落','按显示顺序组织的段落列表。'],
  heading:['段落标题','当前段落的简短标题。'],
  text:['段落正文','当前段落的正文内容。'],
};
function documentedObject<T extends Record<string,z.ZodType>>(shape:T){
  const annotated=Object.fromEntries(Object.entries(shape).map(([key,schema])=>{
    const hint=hints[key];
    if(!hint)throw new Error(`缺少字段提示元数据：${key}`);
    const [title,description,examples]=hint;
    return [key,schema.meta({title,description,...(examples?{examples}:{}),...schema.meta()})];
  })) as T;
  return z.strictObject(annotated);
}

export const Id = z.string().regex(/^[A-Za-z][A-Za-z0-9_-]*$/);
const Text = z.string().min(1).regex(/\S/, '不能仅包含空白字符');
const Texts = z.array(Text);
const NonEmptyTexts = Texts.min(1);
const Ids = z.array(Id);
const TextMap = z.record(Id, Text);
const Value = z.union([z.string(), z.boolean()]);
const Values = z.record(Id, Value);
const Link = z.url({protocol:/^https?$/});
const SchemaHint = z.string().min(1).optional();

export const FieldSchema = documentedObject({
  id:Id, label:Text, description:Text, flag:z.string().regex(/^--?[A-Za-z][A-Za-z0-9-]*$/).nullable(),
  required:z.boolean(), kind:z.enum(['text','boolean','port','positive']), placeholder:z.string(),
});
const ExampleSchema = documentedObject({
  title:Text, assumptions:NonEmptyTexts, values:Values, before:Text, after:Text,
  steps:NonEmptyTexts, takeaways:NonEmptyTexts,
});
export const ResultSchema = documentedObject({before:NonEmptyTexts,after:NonEmptyTexts,example:ExampleSchema.optional()});
export const ScenarioSchema = documentedObject({
  id:Id,title:Text,description:Text,defaults:Values,labels:TextMap,
  placeholders:TextMap.optional(),required:Ids.optional(),fields:Ids.min(1).optional(),
  tokens:z.array(Text).min(1).optional(),sourceSuffix:z.literal('/.').optional(),result:ResultSchema,
});
export const CommandSchema = documentedObject({
  $schema:SchemaHint,id:Id,title:Text,description:Text,source:Link,notes:NonEmptyTexts,
  fields:z.array(FieldSchema).min(1),scenarios:z.array(ScenarioSchema).min(1),
  scenarioOnly:z.boolean().optional(),result:ResultSchema,
});
export const CheckSchema = documentedObject({
  id:Id,label:Text,verify:Text,remedy:Text,scope:Text,kind:z.enum(['condition','platform','installation']),
});
export const ToolSchema = documentedObject({id:Id,title:Text,source:Link,preconditions:z.array(CheckSchema).min(1)});
export const ToolsSchema = documentedObject({$schema:SchemaHint,version:z.literal(1),tools:z.array(ToolSchema).min(1)});
export const OptionSchema = documentedObject({id:Id,label:Text});
export const DimensionSchema = documentedObject({id:Id,label:Text,options:z.array(OptionSchema).min(2)});
export const CoordinatesSchema = z.record(Id,Id);
const Rules = z.record(Id,Ids.min(1));
export interface CheckTree {
  id:string;title:string;priority:number;reason:string;checks:string[];children:CheckTree[];
}
export const CheckTreeSchema: z.ZodType<CheckTree> = z.lazy(()=>documentedObject({
  id:Id,title:Text,priority:z.number().int().nonnegative(),reason:Text,checks:Ids,children:z.array(CheckTreeSchema),
}));
export const SolutionSchema = documentedObject({
  id:Id,title:Text,tool:Id,match:Rules,requirements:Rules,reason:Text,before:Text,after:Text,
  steps:NonEmptyTexts,tradeoffs:NonEmptyTexts,source:Link,
  assistant:documentedObject({command:Id,scenario:Id}).nullable(),
  preconditions:z.array(CheckSchema),acceptance:z.array(CheckSchema).min(1),checkTree:CheckTreeSchema,
});
export const ProblemsSchema = documentedObject({
  $schema:SchemaHint,version:z.literal(1),dimensions:z.array(DimensionSchema).min(1),
  presets:z.array(documentedObject({title:Text,values:CoordinatesSchema})).min(1),solutions:z.array(SolutionSchema).min(1),
});
export const EntitySchema = documentedObject({
  id:Id,type:z.enum(['device','file','directory','short-text','video','service','repository']),label:Text.optional(),
});
export const ResourceEnums = {
  setup:z.enum(['unknown','none','small','flexible']),install:z.enum(['unknown','no','yes']),
  configure:z.enum(['unknown','no','yes']),physical:z.enum(['unknown','yes','no']),
  channel:z.enum(['unknown','yes','no']),toolReady:z.enum(['unknown','yes','no']),
  priority:z.enum(['unknown','quick','repeat']),frequency:z.enum(['unknown','once','repeat']),
};
export const ResourcesSchema = documentedObject(ResourceEnums);
export const RouteSchema = documentedObject({
  id:Id,title:Text,cost:documentedObject({setup:Text,perUse:Text,maintenance:Text}),
  steps:NonEmptyTexts,before:Text,after:Text,acceptance:Text,
});
export const TemplateSchema = documentedObject({
  id:Id,title:Text,aliases:NonEmptyTexts,entities:z.array(EntitySchema).min(1),goal:Text,
  invariants:NonEmptyTexts,routes:z.array(RouteSchema).min(1),
});
const ContractSchema = documentedObject(Object.fromEntries(
  ['id','templateId','utterance','entities','initialState','goal','invariants','resources','evidence','acceptance','selectedRoute'].map(key=>[key,Text.meta({title:hints[key]![0],description:`此字段保存“${hints[key]![0]}”的建模说明文字。`})]),
) as Record<'id'|'templateId'|'utterance'|'entities'|'initialState'|'goal'|'invariants'|'resources'|'evidence'|'acceptance'|'selectedRoute',typeof Text>);
export const ModelSchema = documentedObject({
  $schema:SchemaHint,version:z.string().regex(/^\d+\.\d+\.\d+$/),principles:NonEmptyTexts,
  instanceContract:ContractSchema,resourceFields:z.array(DimensionSchema).min(1),templates:z.array(TemplateSchema).min(1),
});
export const EvidenceSchema = documentedObject({
  value:z.union([z.string(),z.number().finite(),z.boolean(),z.null()]),
  source:z.enum(['user','inferred','observed']),status:z.enum(['unknown','confirmed']),note:Text.optional(),
});
export const InstanceSchema = documentedObject({
  $schema:SchemaHint,id:Id,templateId:Id,utterance:Text,entities:z.array(EntitySchema).min(1),initialState:NonEmptyTexts,
  goal:NonEmptyTexts,invariants:NonEmptyTexts,resources:ResourcesSchema,evidence:z.record(Id,EvidenceSchema),
  acceptance:NonEmptyTexts,selectedRoute:Id.nullable(),
});
export const ArticleSchema = documentedObject({
  $schema:SchemaHint,slug:Id,title:Text,date:z.iso.date(),summary:Text,
  sections:z.array(documentedObject({heading:Text,text:Text})).min(1),
});
export type Command = z.infer<typeof CommandSchema>;
export type ToolCatalog = z.infer<typeof ToolsSchema>;
export type ProblemCatalog = z.infer<typeof ProblemsSchema>;
export type ProblemModel = z.infer<typeof ModelSchema>;
export type ProblemInstance = z.infer<typeof InstanceSchema>;
export type Article = z.infer<typeof ArticleSchema>;
export type ContentBundle = {
  commands:Command[];tools:ToolCatalog;problems:ProblemCatalog;model:ProblemModel;instances:ProblemInstance[];articles:Article[];
};

export { validateReferences } from './references.js';
