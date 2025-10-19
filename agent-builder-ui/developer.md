# agent-builder-ui — Developer Guide & Implementation Plan (TypeScript) v1.0

**Status:** Build-ready  
**Audience:** Frontend engineers (React/TS), Tech leads  
**Scope:** Standalone UI with **Dummy** and **Real** modes; integrates ReactFlow, configurable LLMs, Marketplace/Catalog, node editors, Publish/Test lifecycle.

---

## 1) Goals & Non‑Goals
**Goals**
- Deliver a production‑grade React + TypeScript UI for building agent flows visually.
- Support two runtime modes:
  - **Dummy** (no backend): local fixtures + simulated deploy/test.
  - **Real** (backend-connected): call external services for data & actions.
- Implement full UI spec: header, sidebar, canvas, right panel, node types, configuration panels, Marketplace, Add Resources, Publish/Test.

**Non‑Goals**
- Implement backend services (out of scope for this repo).
- Real AWS Bedrock provisioning logic (only invoked in Real mode through APIs).

---

## 2) High‑Level Architecture

```
React (TypeScript)
├─ App Shell (Header + Layout)
│  └─ Mode Provider (Dummy | Real)
├─ Feature: Flows (ReactFlow editor)
│  ├─ Node Factory (Agent, AgentFlow, Tool, Condition, Human, Input, Output)
│  ├─ Right Panel (Catalogue | Marketplace)
│  └─ Node Config Drawers (closable)
├─ Feature: Settings
│  └─ Configure LLMs (table + Create LLM modal with Test)
├─ Feature: Resources
│  └─ Add Resources modal (name + file → validate)
├─ State (Zustand slices) & Routing
└─ Service Layer (ApiClient interface)
   ├─ DummyApiClient (fixtures + timers)
   └─ RealApiClient (fetch/axios → external endpoints)
```

**Key Patterns**
- **Strategy** for mode switch (Dummy/Real) via `ApiClient` interface.
- **Factory** for ReactFlow node renderers & schemas.
- **Repository** pattern inside service layer (Flows, Agents, Tools, LLMs, Resources).
- **MVVM-ish** separation with View (components), ViewModel (hooks), Model (types/state).
- **Command** (optional) for canvas history (undo/redo) using ReactFlow + internal stack.

---

## 3) Modes: Dummy vs Real

### 3.1 Mode Selection
- Env var: `VITE_APP_MODE` → `'dummy' | 'real'` (default: `dummy`).
- Runtime toggle (dev only) via header dev switch (optional, guarded in code).

### 3.2 Dummy Mode
- Data source: `fixtures/*.json` + `localStorage`.
- Publish: simulate statuses with timers (Draft → Deploying → Deployed; node-level granularity, random small delays). On failure simulation flag, set node red.
- Test: validates JSON then runs a simple mock traversal and returns deterministic response.

### 3.3 Real Mode
- Use `RealApiClient` with endpoints (config via `VITE_API_BASE_URL`).
- WebSocket/SSE for live deploy updates (optional fallback to polling).
- Error mapping from server to UI banners & node statuses.

---

## 4) UI Appearance & Behavior (Final Spec)

### 4.1 Header
- **Left:** Agent Builder logo (click → home).
- **Center:** *(empty)*
- **Right:** **User icon** → dropdown:
  - **Edit Profile** (Name, Description, Interests; Save/Cancel)
  - **Settings** (tabbed modal)
    - **Configure LLMs** tab:
      - Table: **Name (custom alias)** | Model | API Key (hidden) | Status | Created At
      - Button: **Create New LLM** → modal with fields:
        - **Name** (required; used when creating flows)
        - **LLM Provider/Model** (dropdown; Bedrock models or others)
        - **API Key** (secret)
        - **Buttons:** `Test`, `Save`, `Cancel`
        - **Test** calls `/llm/test` (Real) or local mock (Dummy). If not reachable → show error: *"Unable to connect to LLM."*
      - On Save: validate connection first; persist and show in table.
  - **Logout**

### 4.2 Left Sidebar
- **Buttons:**
  - **➕ Create New Flow** → opens Flow form (Name ≤ 25 chars, Description, Select LLM by *Name* alias). After submit → open canvas.
  - **➕ Add Resources** → modal with **Name** + **File** picker; footer: `Upload`, `Cancel`.
    - On Upload: validate (size ≤ 50MB, allowed types: `.zip`, `.json`, `.yaml`, `.js`, `.ts` by default; configurable). In Dummy: save into fixtures store; In Real: POST to `/resources/upload`.
- **Flow list** (no heading): each item → name + status pill (🟠/🟡/🟢/🔴). Click to open.
- **Empty state** (no flow selected): center shows detailed help text; **no right sidebar** or canvas.

### 4.3 Canvas Activation Flow
- On first open/create: if brand-new flow → show **Input** and **Output** nodes only.
- Right Panel visible with **Catalogue** and **Marketplace** tabs.
- Footer bar visible with `Publish` and `Test (disabled)`.

### 4.4 Node Types & Visuals
All nodes are **rounded rectangles** (header → content → footer), unless noted.

1) **Input Node**  
   - Label: **Input**  
   - Connectors: 1 output (right)

2) **Output Node**  
   - Label: **Output**  
   - Connectors: 1 input (left)

3) **Agent Node**  
   - Header: 🤖 icon + **Agent**  
   - Content: **Name:** `<agent-name>`  
   - Footer: **Status:** Draft | Deploying (node shows shimmer animation) | Deployed (green) | Failed (red)  
   - Connectors: input (left), output (right), **top** + **bottom** tool connectors.  
   - **On click:** open **Agent Config Drawer** (closable tabbed panel, replaces right panel):
     - **Agent Basic Details:** Name, Description, LLM (dropdown of configured LLM *Names*)
     - **Environment Variables:** List with `Add New` → Key/Value rows  
     - Footer buttons: `Save`, `Cancel` (close on cancel)

4) **Agent Flow Node (Subflow)**  
   - Header: 🔁 icon + **Agent Flow**  
   - Content: **Name** (flow title, editable here for local alias)
   - Footer: **Status**  
   - Connectors: input (left), output (right)  
   - Drawer: **Agent Flow Details**, **Environment Variables**; `Save`/`Cancel`.

5) **Tool Node**  
   - Header: 🧰 icon + **Tool**  
   - Content: **Name**  
   - Footer: **Status**  
   - Smaller footprint; connects via Agent top/bottom handles.

6) **Condition Node**  
   - Header: ⚖️ icon + **Condition**  
   - Connectors: input (left), outputs (right): **green (true)**, **red (false)**  
   - Drawer (tabs):
     - **Condition Basics:** Name, Description, **Script Type** (default: **Python**)
     - **Configurations:** Monaco editor (syntax highlight)  
       Example:
       ```python
       def condition(input, utils):
           result = utils.LLMInvoke(f"Analyze sentiment of: {input.text}")
           return result == "positive"
       ```
     - Footer: `Save`, `Cancel`

7) **Human Node** (formerly User Node)  
   - Header: 👤 icon + **Human**  
   - Content: **Name**  
   - Footer: **Status:** Draft | Deployed  
   - Connectors: input (left), output (right)  
   - Drawer (tabs):
     - **Details:** Node Name  
     - **Configuration:**
       - **What is your ask?** (question to user)
       - **Prompt Configuration** (syntax-highlighted text area; `$input` is the user message)
       - **Input Validator** (syntax-highlighted text area; `$input` is the candidate answer)  
       - Footer: `Save`, `Cancel`

### 4.5 Right Panel
- **Catalogue** tabs: **Agents**, **Tools**, **Flows**, **Logical Nodes** (Condition, Human)
- **Marketplace** tabs: **Tools**, **Agents**  
  - Right‑click on any card → **Add to My Catalog** | **View Details**

### 4.6 Footer Bar
- **Publish**: triggers deploy sequence (Dummy: simulate; Real: call API).  
  Node statuses animate through Draft → Deploying → Deployed; errors set **Failed**.
- **Test (disabled)**: enabled only when all components are **Deployed**.  
  Opens modal to paste **input JSON**. Validates schema → runs traversal → shows inline output.

---

## 5) Data Models & Types (TypeScript)
```ts
export type Mode = 'dummy' | 'real';
export type Status = 'draft' | 'deploying' | 'deployed' | 'failed';

export type NodeKind = 'input'|'output'|'agent'|'agentFlow'|'tool'|'condition'|'human';

export interface Position { x: number; y: number }

export interface RFNode<T=any> {
  id: string;
  kind: NodeKind;
  position: Position;
  data: T;
  status?: Status; // UI-only status badge
}

export interface RFEdge {
  id: string;
  source: string; // node id
  target: string; // node id
  label?: string;
  color?: 'default'|'green'|'red';
}

export interface FlowGraph {
  id: string;
  name: string; // ≤ 25 chars
  description?: string;
  llmName: string; // custom LLM Name alias (from Settings)
  nodes: RFNode[];
  edges: RFEdge[];
  status: Status; // flow-level
  createdAt: string;
  updatedAt: string;
}

export interface AgentNodeData {
  agentId?: string;
  name: string;
  description?: string;
  llmName?: string;
  env: Record<string,string>;
  attachedToolIds?: string[]; // top/bottom connections
}

export interface AgentFlowNodeData { flowId: string; name: string; env?: Record<string,string>; }
export interface ToolNodeData { toolId: string; name: string; env?: Record<string,string>; }

export type ScriptType = 'python'|'javascript';
export interface ConditionNodeData {
  name: string;
  description?: string;
  scriptType: ScriptType; // default 'python'
  script: string; // source code
}

export interface HumanNodeData {
  name: string;
  ask: string; // the question shown to user
  promptConfig: string; // text with $input
  inputValidator: string; // validation code referencing $input
}

export interface LlmConfig {
  id: string;
  name: string; // custom alias exposed in UI
  model: string; // provider/model id
  apiKeyMasked?: string;
  createdAt: string;
}

export interface ResourceUpload {
  id: string;
  name: string;
  filename: string;
  size: number;
  kind: 'agent'|'tool'|'unknown'; // best-effort classification
  createdAt: string;
}
```

---

## 6) Service Layer (Strategy) — ApiClient Interface
```ts
export interface ApiClient {
  // Flows
  listFlows(): Promise<FlowGraph[]>;
  getFlow(id: string): Promise<FlowGraph>;
  createFlow(input: {name: string; description?: string; llmName: string;}): Promise<FlowGraph>;
  saveFlow(graph: FlowGraph): Promise<void>;
  publishFlow(id: string): Promise<void>; // triggers deploy
  testFlow(id: string, payload: unknown): Promise<{ output: unknown }>;

  // LLMs
  listLlms(): Promise<LlmConfig[]>;
  createLlm(input: {name: string; model: string; apiKey: string}): Promise<LlmConfig>;
  testLlm(input: {model: string; apiKey: string}): Promise<{ ok: boolean; message?: string }>;

  // Resources
  uploadResource(input: {name: string; file: File}): Promise<ResourceUpload>;

  // Catalog & Marketplace (simplified)
  listCatalogAgents(): Promise<ToolOrAgentCard[]>;
  listCatalogTools(): Promise<ToolOrAgentCard[]>;
  listMarketAgents(): Promise<ToolOrAgentCard[]>;
  listMarketTools(): Promise<ToolOrAgentCard[]>;
  addMarketItemToCatalog(id: string, kind: 'agent'|'tool'): Promise<void>;
}

export interface ToolOrAgentCard {
  id: string;
  kind: 'agent'|'tool';
  name: string;
  description?: string;
  status?: Status;
}
```

**Implementations**
- `DummyApiClient`: reads/writes from `localStorage` or in‑memory stores; uses `setTimeout` to simulate deployment progress; returns fixtures for market items.
- `RealApiClient`: uses `fetch/axios` to call external endpoints; SSE/WebSocket for deploy updates.

**Provider**
```tsx
// ModeProvider picks the client and injects via React Context
<ApiClientProvider client={mode === 'real' ? real : dummy}>
  <App />
</ApiClientProvider>
```

---

## 7) State Management (Zustand Slices)
- `useFlowStore` → activeFlowId, graphs cache, create/save/publish/test actions.
- `usePanelStore` → right panel visibility, active drawer (agent/condition/human), selected node id.
- `useSettingsStore` → LLM table, create/test LLM workflow.
- `useMarketStore` → marketplace lists, add→catalog actions.
- `useResourceStore` → uploads and validation state.

Each action calls the `ApiClient` so mode switching is transparent.

---

## 8) Components & Responsibilities

**AppShell**
- Renders Header, Sidebar, Main, optional RightPanel; controls layout based on active flow.

**Header**
- Logo (left), UserMenu (right). UserMenu contains Edit Profile & Settings modal.

**Sidebar**
- Buttons: Create New Flow, Add Resources.
- FlowList (no heading). Each item opens flow.

**HelpPanel**
- Shown when no flow active.

**FlowEditor**
- Hosts ReactFlow; registers custom node types; manages selection.
- Renders footer with Publish/Test.

**RightPanel**
- Tabs: Catalogue, Marketplace; subtabs for lists; right-click menus.

**Drawers** (closable)
- `AgentDrawer`, `AgentFlowDrawer`, `ToolDrawer` (if needed), `ConditionDrawer`, `HumanDrawer`.

**Modals**
- `CreateFlowModal`
- `CreateLlmModal`
- `AddResourcesModal`
- `TestFlowModal`

**Common**
- `KeyValueEditor` (env vars)
- `CodeEditor` (Monaco wrapper)
- `StatusPill`
- `NodeCard` (catalog/market cards)

---

## 9) ReactFlow Integration
- Register `nodeTypes` mapping: `{ input: InputNode, output: OutputNode, agent: AgentNode, agentFlow: AgentFlowNode, tool: ToolNode, condition: ConditionNode, human: HumanNode }`.
- Edge colors: default gray; condition true (green), false (red).
- Node selection opens corresponding Drawer and hides RightPanel.
- Tool-attach via top/bottom handles on Agent; enforce single input/output on agents.

**Serialization**
- On Save/Publish: use `reactFlowInstance.toObject()` and map to `FlowGraph` shape.
- Persist via `ApiClient.saveFlow`.

---

## 10) Validation & Error Handling
- Flow must have exactly one **Input** and one **Output**.
- Agents must have exactly one input and one output; tools connect only to top/bottom handles.
- Condition must return boolean; enforce script presence.
- Human node requires non‑empty **ask**; prompt and validator are optional but validated if present.
- LLM creation requires **Name**, **Model**, **API Key**; **Test** must pass before **Save**.
- Resource upload: file size/type limits; show inline error messages.

---

## 11) Publish & Test Lifecycles

**Publish**
- Dummy: change nodes → `deploying`, then → `deployed` with per-node random delays; optionally simulate a failure if a flag set.
- Real: call `publishFlow(id)`; stream node status events (`node:status`) via SSE/WS; update node colors:  
  - Draft = light orange  
  - Deploying = yellow + shimmer  
  - Deployed = green  
  - Failed = red

**Test**
- Enabled only when all nodes are `deployed`.
- Opens `TestFlowModal`; validate JSON schema; run `ApiClient.testFlow` and show result block.

---

## 12) Folder Structure
```
src/
  app/
    App.tsx
    routes.tsx
    providers/
      ApiClientProvider.tsx
      ModeProvider.tsx
  components/
    header/
    sidebar/
    right-panel/
    drawers/
    modals/
    common/
  features/
    flows/
      FlowEditor.tsx
      node-types/
        AgentNode.tsx
        AgentFlowNode.tsx
        ToolNode.tsx
        ConditionNode.tsx
        HumanNode.tsx
        InputNode.tsx
        OutputNode.tsx
      hooks/
      utils/
    settings/
      ConfigureLlms.tsx
      CreateLlmModal.tsx
    marketplace/
      MarketplacePanel.tsx
    catalogue/
      CataloguePanel.tsx
    resources/
      AddResourcesModal.tsx
  state/
    flowStore.ts
    panelStore.ts
    settingsStore.ts
    marketStore.ts
    resourceStore.ts
  services/
    api/
      ApiClient.ts
      DummyApiClient.ts
      RealApiClient.ts
    adapters/
      flowsRepo.ts
      llmRepo.ts
      marketRepo.ts
  fixtures/
    flows.json
    agents.json
    tools.json
    llms.json
  lib/
    reactflow.ts
    monaco.ts
    validators.ts
    schema/
      flow.ts
      inputPayload.ts
  styles/
    index.css
  main.tsx
  index.html
```

---

## 13) Design System & Styling
- **TailwindCSS** with custom tokens for statuses.
- Node colors:  
  - Draft `#fbbf24`  
  - Deploying `#fde047` (animate shimmer)  
  - Deployed `#86efac`  
  - Failed `#ef4444`
- Use **Framer Motion** for drawers and panel transitions.

---

## 14) Routing
- `/:flowId?` → optional `flowId`. If absent → HelpPanel.
- Open flow sets route; refresh restores state.

---

## 15) Key Implementation Snippets

**Mode bootstrap (main.tsx)**
```ts
const mode = (import.meta.env.VITE_APP_MODE as Mode) || 'dummy';
const apiClient: ApiClient = mode === 'real' ? new RealApiClient() : new DummyApiClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ApiClientProvider client={apiClient}>
    <App />
  </ApiClientProvider>
);
```

**ApiClient shape** — see Section 6.

**LLM Test flow (Settings)**
```ts
async function onTestLLM(values:{name:string; model:string; apiKey:string}){
  const res = await api.testLlm({model: values.model, apiKey: values.apiKey});
  setBanner(res.ok ? {kind:'success', text:'LLM connection verified'} : {kind:'error', text: res.message || 'Unable to connect to LLM'});
}
```

**Dummy publish simulation**
```ts
for (const node of graph.nodes) {
  if (node.kind === 'input' || node.kind === 'output') continue;
  updateNodeStatus(node.id, 'deploying');
  await wait(rand(400, 1200));
  updateNodeStatus(node.id, 'deployed');
}
```

---

## 16) Developer Workflow
1. **Scaffold**
   ```bash
   npm create vite@latest agent-builder-ui -- --template react-ts
   cd agent-builder-ui
   npm i reactflow zustand @tanstack/react-query tailwindcss postcss autoprefixer framer-motion monaco-editor class-variance-authority clsx
   npx tailwindcss init -p
   ```
2. **Configure Tailwind** (`content` globs, base styles).  
3. **Create ApiClient** contracts & Dummy implementation.  
4. **Build AppShell, Header, Sidebar, HelpPanel.**  
5. **Add CreateFlowModal & flow store.**  
6. **Integrate ReactFlow with Input/Output nodes.**  
7. **Add node renderers & drawers (Agent, AgentFlow, Tool, Condition, Human).**  
8. **Right Panel (Catalogue/Marketplace) with right‑click context.**  
9. **Add Resources modal + validations.**  
10. **Publish/Test flows (Dummy simulation).**  
11. **Settings → Configure LLMs (Name, Model, API Key + Test).**  
12. **Polish: animations, status pills, error banners.**

---

## 17) Testing Strategy
- **Unit:** vitest for stores and service layer.
- **Component:** React Testing Library (drawers, modals, panel tabs).
- **E2E:** Playwright — scenarios: create flow, add agent, configure, publish (dummy), test.
- **Accessibility:** Axe rules; keyboard navigation for menus and drawers.

---

## 18) Accessibility & i18n (Recommended)
- ARIA labels for menus, dialogs, drawers.
- Keyboard focus trapping in modals.
- String catalogs for future localization.

---

## 19) Error Surfaces & UX Copy
- Global toast system for success/error.
- In‑drawer field errors (zod schema validation).
- LLM Test failure: clear, actionable message.
- Resource upload: specific file/type/size errors.

---

## 20) Future Enhancements
- Parallel/Join nodes; swimlanes; mini‑map; snaplines.
- Versioned flows; diff view.
- Import/Export of flows as JSON.
- Team collaboration (presence + locks).

---

## 21) Fixtures (Dummy Mode Examples)

**fixtures/llms.json**
```json
[
  {"id":"l1","name":"Claude-Primary","model":"bedrock:claude-v3","createdAt":"2025-10-15"}
]
```

**fixtures/flows.json**
```json
[]
```

**fixtures/market-agents.json**
```json
[
  {"id":"ma1","kind":"agent","name":"Summarizer"},
  {"id":"ma2","kind":"agent","name":"Classifier"}
]
```

**fixtures/market-tools.json**
```json
[
  {"id":"mt1","kind":"tool","name":"MCP-Email"},
  {"id":"mt2","kind":"tool","name":"MCP-CRM"}
]
```

---

## 22) Acceptance Checklist
- [ ] Header with logo + user menu (Edit Profile, Settings, Logout)
- [ ] Settings → **Configure LLMs** with **Name**, **Model**, **API Key**, **Test** + Save
- [ ] Sidebar: **Create New Flow** + **Add Resources** (modal name+file; Upload/Cancel; validation)
- [ ] Empty state: help text; no right panel/canvas
- [ ] Create Flow form (Name≤25, Description, LLM by Name) → canvas with Input/Output
- [ ] Right Panel: **Catalogue** (Agents, Tools, Flows, Logical Nodes) & **Marketplace** (Tools, Agents; right‑click Add to Catalog / Details)
- [ ] Node renderers for Input, Output, Agent, AgentFlow, Tool, Condition, Human
- [ ] Drawers: Agent, AgentFlow (basic + env vars); Condition (basics + Monaco editor); Human (ask + prompt + validator)
- [ ] Footer: **Publish** + **Test (disabled)**; state colors and animations
- [ ] Dummy mode publishes & tests without external calls; Real mode delegates to `ApiClient`

---

## 23) New‑Hire Quickstart (for UI Devs with Zero Context)
1. **Read first:** Sections 2, 4, 6, 12 in this guide.
2. **Install:** Node 18+, pnpm or npm.
3. **Clone & run:**
   ```bash
   pnpm i
   cp .env.example .env             # set VITE_APP_MODE=dummy by default
   pnpm dev                         # http://localhost:5173
   ```
4. **Play in Dummy mode:** Create a flow, drag nodes, hit Publish to see simulated statuses, then Test.
5. **Switch to Real mode:** Set `VITE_APP_MODE=real` and `VITE_API_BASE_URL`, then restart.
6. **Read the UI map below** to understand pages, panels, and where each feature lives.

---

## 24) Essential Glossary (UI‑centric)
- **Catalogue**: The user’s private library (Agents, Tools, Flows, Logical Nodes). Flows list includes **only deployed** flows.
- **Marketplace**: Public/remote listing with **Agents** and **Tools** (no flows). Right‑click items → **Add to My Catalog**.
- **Human Node**: Pauses execution to collect user input; resume continues the thread.
- **Condition Node**: Runs a script (Python by default) that returns true/false.
- **Publish vs Test**: Publish deploys; Test simulates/executes with an input JSON (enabled only after all nodes are deployed/green).

---

## 25) Wireframes (Annotated)

### 25.1 App Shell (No Flow Selected)
```
┌ Header: [LOGO]                                     [User Icon] ┐
├────────────────────────────────────────────────────────────────┤
│ Sidebar                                                        │  (no right panel)
│  + Create New Flow                                             │
│  + Add Resources                                               │
│  [list of flows…]                                              │
│                                                                │
│ Canvas Area → HELP PANEL:                                      │
│  "Welcome to Agent Builder… Click Create New Flow to start."  │
└────────────────────────────────────────────────────────────────┘
```

### 25.2 Active Flow (Canvas + Right Panel)
```
┌ Header: [LOGO]                                     [User Icon] ┐
├────────────────────────────────────────────────────────────────┤
│ Sidebar              │ Canvas (ReactFlow)                │ Right Panel       │
│ + Create New Flow    │  [Input] → [Agent] → [Output]     │  Tabs:            │
│ + Add Resources      │                                  │   - Catalogue     │
│ [flows…]             │                                  │     Agents/Tools/ │
│                      │                                  │     Flows/Logical │
│                      │                                  │   - Marketplace   │
└──────────────────────┴──────────────────────────────────┴────────────────────┘
Footer (inside canvas): [Publish]   [Test (disabled until deployed)]
```

---

## 26) Empty‑State Help Text (Copy‑ready)
> **Welcome to Agent Builder**  
> Create and deploy intelligent agent workflows.
>
> **Get started**
> 1) Click **Create New Flow** in the left sidebar.  
> 2) Name it, add a short description, and pick an LLM (Configure LLMs in Settings first).  
> 3) Drag **Agents**, **Tools**, and **Logical Nodes** from the right panel onto the canvas.  
> 4) Click **Publish** to deploy, then **Test** to run an input JSON.  
>
> Need help? Open **Settings → Configure LLMs** to add providers, or **Add Resources** to upload artifacts.

---

## 27) Visual System (Tokens & Sizes)
- **Spacing:** 8px grid.  
- **Radius:** nodes `12px`, cards `16px`, buttons `10px`.  
- **Typography:** Inter (14/16/20/24).  
- **Node sizes (guidance):**  
  - Input/Output: 240×64  
  - Agent: 280×160  
  - Agent Flow: 260×120  
  - Tool: 200×96  
  - Condition/Human: 240×120
- **Edge styles:** default gray `#cbd5e1` (2px); **true** → green `#22c55e`; **false** → red `#ef4444`.
- **Status colors:** Draft `#fbbf24`; Deploying `#fde047` (shimmer); Deployed `#86efac`; Failed `#ef4444`.

---

## 28) Right‑Click Menus (Cards & Nodes)
- **Marketplace Card** (Agents/Tools): Add to My Catalog, View Details
- **Canvas Node** (Agent): Configure, Duplicate, Delete
- **Canvas Node** (Condition/Human): Configure, Duplicate, Delete
- **Edge**: Edit Condition (if condition‑capable), Delete

---

## 29) Add Resources — UX & Validation
- **Trigger:** Left sidebar → **Add Resources**.
- **Modal Fields:** Name (required), File (required).  
- **Footer:** `Upload` (primary), `Cancel`.
- **Validation:** size ≤ 50MB; allowed: `.zip`, `.json`, `.yaml`, `.yml`, `.js`, `.ts`.  
- **Dummy mode:** stores in local list and links to Catalogue as appropriate.  
- **Real mode:** POST `/resources/upload` → on success shows toast and adds to Catalogue (Agents/Tools) if recognizable.

---

## 30) Catalogue & Marketplace — Card Layout
- **Card**:  
  - Icon + Title  
  - 1‑line description  
  - Status pill (for Catalogue only)  
  - Hover → kebab menu (…)
- **Drag & Drop**: Cards in Catalogue are draggable onto canvas.  
- **Right‑click** in Marketplace: Add to My Catalog (clones into Catalogue), View Details (modal with longer description/manifest snippet).

---

## 31) Panel Drawers — Interaction Rules
- Selecting a canvas node **opens its drawer** and **hides** the main right panel.  
- Drawers are **closable** (X icon or Cancel).  
- `Save` applies changes and closes drawer; invalid fields show inline errors.  
- Only one drawer visible at a time.

---

## 32) Dummy Mode Fixtures — Starter Content
- `fixtures/llms.json` → one working LLM preset (`Claude-Primary`).
- `fixtures/market-agents.json` → 2–3 agent templates.
- `fixtures/market-tools.json` → 2–3 tools (e.g., MCP‑Email, MCP‑CRM).
- `fixtures/flows.json` → empty list.
- `fixtures/resources.json` → starts empty; uploaded files appended here in dummy mode.

---

## 33) Real Mode — Expected Endpoints (UI Contract)
- `GET /flows` → FlowGraph[]
- `POST /flows` → FlowGraph
- `GET /flows/:id` → FlowGraph
- `PUT /flows/:id` (or `POST /flows/save`) → { ok: true }
- `POST /flows/:id/deploy` → { ok: true }
- `GET /flows/:id/events` (SSE) → node status updates
- `POST /flows/:id/test` (or `/agents/:agentId/invoke`) → { output }
- `GET /llms` | `POST /llms` | `POST /llm/test`
- `POST /resources/upload`
- `GET /market/agents|tools` | `POST /market/:id/add`

> The UI already abstracts these via `ApiClient`. Real implementations should follow the shapes in Section 6.

---

## 34) Error UX — Copy Library
- **LLM Test Failed:** “Unable to connect to LLM. Check model and API key.”
- **Invalid Flow:** “Flow must include exactly one Input and one Output.”
- **Missing Script:** “Condition requires a script that returns true/false.”
- **Human Ask Empty:** “Please add a question for the Human node.”
- **Resource Upload Too Large:** “File exceeds 50MB limit.”
- **Publish Failed:** “Some components failed to deploy. Check red nodes for details.”
- **Test Disabled:** “Deploy the flow before testing.”

---

## 35) Accessibility Checklist
- All modals/drawers use focus trap, ESC to close, labelled by titles.
- Buttons have discernible text; icons include `aria-label`.
- Keyboard DnD fallback: provide add buttons in cards for non‑mouse users.
- Color usage supports contrast ≥ 4.5:1; never rely on color only for meaning (include status text).

---

## 36) QA Scenarios (Happy & Edge)
1. Create LLM with failing Test → Save blocked; error banner shown.  
2. Create Flow → canvas with Input/Output → add Agent and Tool; Save.  
3. Publish in Dummy mode → shimmer then green; Test enabled.  
4. Condition Node with empty script → Save blocked.  
5. Human Node with ask/prompt/validator; Test run shows prompt then resumes (Dummy simulate).  
6. Marketplace → right‑click Add to My Catalog; then drag item from Catalogue.

---

## 37) Example Input Payload Schema (for Test)
```ts
// lib/schema/inputPayload.ts (zod)
export const InputPayloadSchema = z.object({
  threadId: z.string().optional(),
  input: z.any(),           // user-defined payload
  metadata: z.record(z.any()).optional()
});
```
Dummy mode simply echoes and appends a `result` field.

---

## 38) Dev Scripts & Env
- `pnpm dev` → run Vite dev server
- `pnpm build` → production build
- `pnpm preview` → preview prod build
- Env vars:  
  - `VITE_APP_MODE` = `dummy` | `real`  
  - `VITE_API_BASE_URL` (real mode)  
  - `VITE_ENABLE_DEV_TOGGLE` (optional)

`.env.example`
```
VITE_APP_MODE=dummy
VITE_API_BASE_URL=http://localhost:4000
VITE_ENABLE_DEV_TOGGLE=false
```

---

## 39) Troubleshooting
- **Blank Canvas:** Ensure you created or opened a flow. In empty state, right panel is hidden by design.
- **LLM not appearing:** Add it in Settings → Configure LLMs (Name/Model/API Key) and pass Test.
- **Test button disabled:** Publish succeeded? All nodes must be green.
- **Cannot attach Tool:** Only via Agent’s top/bottom connectors.
- **Scripts not saving:** Check language (Python default) and syntax; errors shown inline.

---

## 40) Contribution & Code Style
- Use ESLint + Prettier; commit hooks with `lint-staged` recommended.
- Prefer functional components + hooks; avoid class components.
- Keep components small; move logic into hooks (e.g., `useAgentDrawer`).
- Write unit tests for stores and utilities.

---

**End of Guide**

