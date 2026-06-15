# RFC 0002 — Nodes

| Field      | Value                                           |
| ---------- | ----------------------------------------------- |
| Status     | Draft                                           |
| Author     | Hani Chalouati                                  |
| Created    | 2026-04-11                                      |
| Target     | Phase 1 (all three deployment modes, uniformly) |
| Supersedes | —                                               |
| Related    | RFC 0001 (Integrations), RFC 0003 (Environments) |

## 1. Summary

A **node** is a Guepard dataplane: a self-contained runtime that holds the versioned storage (GFS), runs the query engine, runs the branching/clone/commit operations, and runs the ingestion pipeline that turns a source database into a git-like database. A git-like database always lives on exactly one node at a time — the node is the physical home of its bytes and of every operation performed on them.

Nodes exist to give users a **choice of where their data runs**. Guepard ships three deployment modes for a node, all first-class from day one:

- **Bring-your-own (BYO) private node** — the user runs the node on their own infrastructure (their cloud account or on-prem). No user bytes ever leave their network. In phase 1 a node is a virtual machine. For users with an RFC 0001 AWS integration, Guepard provisions the EC2 VM itself via the AWS SDK (subnet, VPC, and instance type supplied by the user at provisioning time; cloudinit bootstraps the dataplane). For on-prem, Guepard hands the user a CDKTF script that provisions and enrolls the VM against their local hypervisor. GCP, AMI images, and other delivery formats are phase-2 additions.
- **Guepard-hosted private node** — Guepard runs a dedicated node for the user on Guepard Cloud. One node, one tenant, known resource envelope. Zero cloud-ops for the user, stronger performance guarantees than the public dataplane.
- **Public mutualised dataplane** — a pool of Guepard-operated nodes, one pool per region. The user picks a region, the control plane schedules each new database into its own container on a public node in that region. Shared infrastructure, per-database hard isolation, usage-based billing. This is the "just works" path for trials and light workloads.

All three modes expose the **same node contract** to the rest of Guepard: they run the same GFS storage engine, the same query engine, the same ingestion pipeline, and the same control-plane ↔ dataplane protocol. Anything a user can do on one mode (ingest, branch, clone, commit, time-travel, query, run agents against) they can do on the other two. The mode only changes *where* the bytes live, *who operates* the runtime, and *who pays* for the cloud resources underneath it.

## 2. Motivation

Guepard is a data platform built around **git-like databases** — Postgres-compatible (and later others) databases that the user can branch, clone, commit, diff, time-travel, and hand to AI agents. That whole story depends on a runtime somewhere doing the actual work: serving queries, storing versioned state, creating branches in milliseconds, applying commits, pulling ingestions from source systems, exposing metrics.

Everything else in the platform is a client of that runtime:

- The **environments UI** (RFC 0003) lets a user clone a source database into a Guepard-managed database. Step 4 of that workflow is explicitly "the user selects on what Node he can do this." The environments feature is blocked on nodes existing.
- The **integrations primitive** (RFC 0001) exists in large part to unlock "dataplane private nodes" — its phase-2 goal is provisioning a node inside the user's cloud account. That phase 2 is exactly the "BYO, integration-provisioned" path described here.
- The **AI agents** in `packages/agent-factory-sdk` run queries against registered Guepard databases. Every query they issue eventually hits a node.

Today, none of this exists. The console has a conceptual git-like database (planned) and a conceptual environments UI (RFC 0003) but nothing that tells the story of *where* that database is running. Nodes are the missing layer between "the user's project" and "a real process serving queries somewhere."

Three separate product concerns converge on "nodes":

1. **Compliance and data locality.** A non-trivial fraction of prospective users cannot ship their bytes across a network boundary, either for regulatory reasons (GDPR, HIPAA, sector-specific rules) or because the data is simply too large to move out of the VPC. For these users, the runtime has to physically live inside their infrastructure. That is the *BYO* node story.

2. **Dedicated performance and isolation without cloud-ops.** Mid-market users want a predictable resource envelope and hard isolation, but don't want to bring their own cloud account. They want Guepard to run a machine for them that is theirs alone. That is the *Guepard-hosted private* node story.

3. **Zero-friction on-ramp.** Someone trying Guepard for the first time should not have to provision infrastructure before they can ingest a database and branch it. They should click "create a database", the platform schedules it somewhere sensible in a region they picked, credits start burning when they use it, done. That is the *public mutualised* node story.

One primitive that serves all three is strictly better than three fragmented ones: a single project can hold a public-dataplane attachment for dev, a hosted-private node for staging, and a BYO node for prod at the same time, with every new database picking whichever node the user wants. A database created on one node stays on that node for the lifetime of phase 1 — graduating an existing database between modes is a phase-2 story (see §11) and is explicitly not a phase-1 deliverable. What phase 1 does deliver is the ability for a project to *operate simultaneously* across all three modes and pick the right mode for each new database at creation time.

A secondary, equally important consideration: **the three modes must share one substrate**. If the BYO node runs different software from the public dataplane, then "branching works on public but not on BYO" becomes a possibility, and the product story collapses. The whole point of this RFC is that there is one node contract and three operational wrappers around it.

## 3. Goals and non-goals

### 3.1 Goals (phase 1)

Phase 1 is deliberately broad — it describes and delivers all three deployment modes uniformly — but narrow on what each mode *does* in v1.

- **Three deployment modes, end-to-end**, each one capable of hosting a git-like database, running queries against it, ingesting a source database into it, and creating branches of it:
  - BYO private — virtual machines, delivered in two ways in phase 1: (a) **integration-provisioned on AWS** via the user's RFC 0001 AWS integration (Guepard calls the AWS SDK with user-supplied subnet / VPC / instance type, cloudinit scripts bootstrap the dataplane), and (b) **on-prem via Guepard-provided CDKTF scripts** that the user runs against their own hypervisor. GCP integration-provisioned, AMI images, and other formats are phase-2 additions.
  - Guepard-hosted private — a one-click "give me a dedicated node in region X at size Y" flow, fulfilled by Guepard operations. Size choices: **three fixed tiers — Small / Medium / Large** (the concrete vCPU / memory / disk envelopes per tier land in the spec).
  - Public mutualised — users pick a region, control plane schedules each new database as an isolated container on a public node in that region.
- **One node contract** — a single set of domain-level operations (create database, create branch, pull ingestion, run query, drain, terminate) that every mode implements identically. The mode is an attribute of the node, not a branch in the domain logic. Database migration between nodes is **not** part of phase 1's contract.
- **Pull-model control plane ↔ node communication**:
  - **REST** for one-shot node enrollment (node dials home with a bootstrap token, receives its identity).
  - **NATS** for ongoing bidirectional control: Guepard publishes commands onto subjects the node subscribes to; the node publishes lifecycle events and operation results back.
  - **OTEL** for metrics, logs, and traces shipped from the node to a Guepard OTEL collector.
  - All three transports flow **outbound only** from the node's perspective. Guepard never needs inbound reach into the user's network.
- **Region as a first-class attribute** of every node, set at creation time and fixed for the life of the node. The user picks the region; the platform cannot silently move a node across regions.
- **Project-scoped ownership** for private nodes (BYO + Guepard-hosted). A private node belongs to one project and is listed in that project's node pool. Every database created in the project picks one of the project's attached nodes at create time. A project can have many nodes attached (e.g. a BYO node for prod, a public one for dev).
- **Per-database attachment** to a node: a database is created on one node and **pinned** to that node for the whole of phase 1. No cross-node clones, no replication, no migration in v1.
- **Credits billing** only for resources that actually run on Guepard Cloud: public mutualised nodes, Guepard-hosted private nodes (flat hourly envelope rate while Healthy), and AI agent token usage. BYO and on-prem nodes run under the user's existing Guepard licence and consume no credits for the runtime itself.
- **Observability for the user**: for every node the project owns, the user sees its mode, region, health, version, and — for private nodes — aggregated metrics (databases hosted, branch count, storage used, recent operations) streamed via OTEL.
- **No default node at project creation.** A project is born without any nodes. The first time the user tries to create or ingest a database, they are asked to attach a node (matching RFC 0003 step 4). This avoids silently spending credits on users who aren't ready to run anything yet.

### 3.2 Non-goals (phase 1)

Stated here so each becomes a named future phase rather than a surprise.

- **Database migration between nodes.** A database is pinned to its creation node in phase 1. Graduating a database from public → hosted-private → BYO, moving a database out of a degraded node, or rebalancing across nodes is all **phase 2**. Until then, "change the node a database runs on" means "create a new database on the new node and discard the old one."
- **Replication / HA across nodes.** A database lives on exactly one node in v1. No primary/standby, no read replicas, no cross-node sharding. Phase 2.
- **Cross-node clones.** Cloning a branch of a prod database onto a dev node is a tempting primitive but implies a network transfer between nodes that we haven't designed. Phase 2.
- **Node resizing in place.** Want a bigger hosted-private node? Wait for phase 2, which will add both in-place resize and database migration together. Phase 2.
- **Auto-scaling public nodes.** The public dataplane pool in each region is provisioned by Guepard operations. It does not auto-grow under load in v1; instead, it is sized headroom-first. Phase 2+.
- **Multi-region databases.** A database lives in one region (the region of its node) in v1. "Database replicated across `us-east-1` and `eu-west-1`" is a phase-3 story that stacks on top of phase-2 replication.
- **OIDC / federated credentials for BYO.** The BYO integration-provisioned path uses RFC 0001's long-lived credentials in v1. Federated provisioning lands in RFC 0001's phase 4 and is orthogonal to this RFC.
- **GCP integration-provisioned BYO nodes.** Phase 1 BYO via integration is **AWS-only** (EC2 + cloudinit). GCP integration already exists in RFC 0001's surface, but wiring Guepard-side provisioning against GCE / Cloud Run is phase 2. On-prem (via CDKTF scripts) is phase 1.
- **Auto-updating nodes.** Node version upgrades are **user-triggered** in phase 1; a banner on the node detail view surfaces "update available" and the user clicks when it suits them. Auto-update channels are phase 5.
- **Fine-grained per-database quotas** beyond the container-level resource limits on the public dataplane. Phase 2.
- **Org-level node pools.** A node is project-scoped in v1. Sharing a node across multiple projects in the same org is a clean extension but not in v1.
- **Bring-your-own-storage separate from bring-your-own-compute.** A BYO node is one thing that owns both its compute and its GFS storage. A split where compute is BYO but storage is in Guepard Cloud (or vice versa) is not supported.

## 4. Prior art in the codebase

- **RFC 0001 — Integrations.** Models a project-scoped credential to a cloud account (AWS, GCP in phase 1). Its phase-2 mentions "dataplane private nodes" — that is the **cloud-integration-provisioned slice** of the BYO mode described here. This RFC does *not* depend on RFC 0001 for the public mutualised or Guepard-hosted-private modes, and does not depend on RFC 0001 for **on-prem BYO** either (on-prem uses Guepard-shipped CDKTF scripts and has no cloud integration involved). The relationship is: *"if you run BYO on AWS and have an integration, Guepard provisions the EC2 VM for you; if you run BYO on-prem, Guepard gives you a CDKTF script to run yourself; if you don't run BYO at all, RFC 0001 is irrelevant to nodes."* An update to RFC 0001 to point at this RFC is expected.
- **RFC 0003 — Environments.** The UI that lets a user connect to a source database and clone it into Guepard. Its step 4 explicitly defers the "on what node" choice to this RFC. The environments feature is the first consumer of nodes and shapes the node-pick UX assumptions in §9.
- **`packages/agent-factory-sdk`.** Consumes registered databases by id. Does not learn about nodes. When an agent queries a database, the shell runtime resolves the database to its current node and routes the query — the agent never sees node identities.
- **GFS (git-like file/database layer).** The versioning substrate. GFS is *the* storage format a node runs internally; a node is, at its core, a host that embeds GFS and exposes branch/commit/clone operations over it. GFS itself is orthogonal to which deployment mode the node runs under.
- **`packages/extensions-sdk`.** A driver-plugin system scoped to datasource *connectors* (how to talk to Postgres, MySQL, ClickHouse, MongoDB, etc.). Irrelevant to nodes as a concept — nodes are not datasource drivers — but the "one interface, many implementations" shape is prior art for how node mode adapters could be organised.
- **Qwery-era `datasources`.** A legacy primitive modelling a connection to a single database. Not reused. Nodes and datasources address different layers (nodes = *where a database runs*, datasources = *how to reach an external one*), and conflating them would make both worse.
- **Shell app registry and plugin system.** Nodes will get their own plugin app (`packages/apps/nodes`, to be created by the spec). Existing `packages/apps/notebook` and the new `packages/apps/datasources` are the structural reference.

## 5. Conceptual model

This section describes what a node **is** independent of how it is deployed. The three modes in §6 are three different ways to bring a node of this shape into existence.

### 5.1 A node is a self-contained dataplane

A node owns, and is responsible for, everything that happens to a git-like database:

- **Versioned storage.** The GFS-backed store that holds the database's committed state, branch heads, commit history, and garbage-collection-safe snapshots. The bytes live on the node's local storage (or storage attached to the node).
- **Query engine.** The Postgres-compatible endpoint (and any federated query engine on top) that serves read and write traffic against any branch of any database hosted on the node.
- **Branching / clone / commit operations.** Creating a branch, merging, time-travelling, resetting — all handled by the node against its local GFS state.
- **Ingestion pipeline.** The process that takes a source database (via a datasource extension, a snapshot file, a logical-replication stream) and turns it into a root commit of a new git-like database. Ingestion runs *on the destination node*, streaming source bytes directly into the local GFS store.
- **Observability surface.** Metrics (queries/sec, storage used, branch count), logs, traces, and lifecycle events, all emitted over OTEL to the control plane.

The consequence of this shape is that a git-like database is **not a remote pointer**. A database *is* a collection of GFS objects + metadata *on one specific node*. Moving it means copying those objects somewhere else. This is deliberate: it keeps latency low, keeps the data boundary clear, and makes compliance arguments easy to state ("your bytes are on this node, in this region, operated by this party").

### 5.2 A node belongs to a project, a database attaches to a node

- Private nodes (BYO + Guepard-hosted) are **project-scoped**. They appear in one project's node pool, and nowhere else. An organisation with many projects has many node pools.
- The public mutualised dataplane is **Guepard-scoped** but **per-region**: a shared pool of nodes operated by Guepard, available to any project in any organisation on a pay-by-credits basis. A project doesn't "attach" to a specific public node; it attaches to a public *region*, and the control plane decides which physical public node each new database lands on.
- A **project can have many nodes attached at once**. Typical example: one BYO node in the user's AWS account for production, one public dataplane attachment in `eu-west-1` for development and experimentation, and later a Guepard-hosted private node for staging. Each is a distinct node in the project's pool.
- Every **database in the project picks one of the project's attached nodes at creation time**. The database is then **bound to that node for the lifetime of phase 1** — no migration, no cross-node clones, no replication.
- A project is created **with zero nodes**. The first time the user tries to create or ingest a database, the UI prompts them to attach a node to the project (matching RFC 0003's workflow).

### 5.3 A database is pinned to its creation node in phase 1

A database is a collection of GFS objects + metadata on one specific node, chosen at creation time. Phase 1 offers **no operation to move that database to a different node** — not offline, not online, not as an administrator escape hatch. If a user wants the same data on a different node (e.g. to graduate from public to hosted-private, or from hosted-private to BYO), the phase-1 answer is: create a new database on the new node, re-ingest from the same source, and discard the old one.

This is a deliberate scope cut, not a final design position. Phase 2 will introduce a first-class migration operation — "move this database from node A to node B, with its full branch history" — and will build it alongside database replication and HA. The two problems share most of their implementation: both need to stream GFS objects between nodes reliably, handle schema evolution on the receiving side, and coordinate cutovers without corrupting branch metadata. Shipping them together in phase 2 is cheaper than shipping migration alone in phase 1 and then revisiting it for replication later.

What this scope cut means in practice:

- **The graduation story is "one new database at a time"** in phase 1. Users can have a project with a public node for dev, a hosted-private for staging, and a BYO for prod all at once; they just can't move an existing database from one to the other.
- **A degraded or terminated node's databases are not automatically rescued.** If a BYO node goes offline, its databases are unreachable until the node comes back. See §9 for the offline-node UX.
- **The data model still needs to support migration later** — specifically, no field on the database row should assume its node is immutable. The spec commits to a foreign key shape that can be updated via a phase-2 migration operation.

### 5.4 Regionality is a first-class attribute

Every node has a region, set at creation time and immutable for the lifetime of that node. Regions come from:

- **Public dataplane** — Guepard operates a pool of nodes in each supported public region. **Phase 1 ships two public regions: US-East and EU-West.** The user always picks the region explicitly at attachment time; there is no silent default, even where one could be derived from billing address or locale.
- **Guepard-hosted private** — the user picks a region from the catalogue of regions Guepard offers for dedicated nodes. This is a subset of (or equal to) the public region catalogue — phase 1 is the same two (US-East + EU-West).
- **BYO private** — the region is whatever the user provisioned the node in.
  - For the **integration-provisioned AWS path**, the user picks from the regions RFC 0001's `listRegions` returns for their AWS integration; the node's region is whatever the user selected.
  - For the **on-prem CDKTF path**, the user declares a region label at install time (typed into the CDKTF config or the enrollment UI). Guepard **cross-checks the declared region against IP geolocation during enrollment** and surfaces a warning in the node detail view if the two disagree — but does not block enrollment, because behind-VPN, NAT, and private-network deployments are legitimate and common in this path.

"Region" is the coarsest unit of data locality the platform reasons about in v1. If you need a database in Frankfurt, you need a node in Frankfurt — there's no "logical Europe" abstraction that routes to the nearest physical node.

### 5.5 Lifecycle states

Every node — regardless of mode — moves through the same minimal state machine from the user's perspective:

- **Enrolling** — created in the control plane, waiting for its first successful heartbeat from the dataplane.
- **Healthy** — passing liveness and, for private nodes, reachable over NATS for command delivery. Can accept new databases.
- **Degraded** — heartbeats present but health checks failing (e.g. disk pressure, lagging ingestion, elevated query error rate). Existing databases keep running; the UI warns. New databases are still accepted unless §9's policy says otherwise.
- **Draining** — refusing new databases; existing ones are being gracefully stopped (queries allowed to finish, connections closed cleanly) ahead of termination. Entered either by the user ("decommission this node") or by the platform (for a Guepard-hosted node being replaced). In phase 1 draining is irreversible in practice — because migration is not available, databases on a draining node cannot be moved; the operator's choices are "let it drain and lose the databases" or "cancel the drain." Phase 2's migration operation converts draining into a genuine rebalance.
- **Terminated** — no longer part of the pool, no databases on it. Final state; a terminated node cannot be revived.

Phase 1 does not add intermediate states like "upgrading" or "rebooting" — those are surfaced as "degraded with a reason string". Formalising them is phase 2+.

## 6. The three deployment modes

The three modes differ in **who runs the node**, **where it physically runs**, **how it is provisioned**, **how it is enrolled**, **who pays for the underlying cloud**, and **what tenant-isolation boundary applies**. They are identical in the node contract (§5) above.

### 6.1 Public mutualised dataplane

- **Who operates.** Guepard operations.
- **Where it runs.** Guepard Cloud, one pool of nodes per supported region.
- **Tenant isolation.** Per-database hard isolation: every database created on a public node runs in **its own container** on that node. Storage is per-database (not shared between containers), compute is per-database (CPU / memory cgroups), and the query endpoint is per-database. Control plane scheduling decides which physical public node a new database lands on, and users do not pick a specific node — they pick a region.
- **Provisioning.** No user action. The public pool already exists. A project "attaches" to a public region with a single click, and from that moment every database created in the project can target that public-region attachment instead of a private node.
- **Enrollment.** Not applicable. Public nodes are enrolled by Guepard out of band, long before any user sees them.
- **Who pays.** Every operation that uses CPU, memory, storage, or network on a public node consumes user credits at rates defined in §7. A user who never spins up a database on the public dataplane never pays anything for it.
- **Primary use cases.** Trial / onboarding, hobby projects, transient dev databases, scratch branches the user doesn't want on their paid node.

### 6.2 Guepard-hosted private node

- **Who operates.** Guepard operations.
- **Where it runs.** Guepard Cloud, one VM per customer request.
- **Tenant isolation.** The whole VM is dedicated to one project. No other customer's databases run on it. Hard resource isolation at the VM / OS level (not container-sharing, unlike the public dataplane).
- **Provisioning.** The user picks a region (US-East or EU-West in phase 1) and a **size tier — Small, Medium, or Large** (three fixed envelopes; concrete vCPU / memory / disk values land in the spec). Guepard provisions the underlying VM, bootstraps a node process on it via cloudinit, and completes enrollment automatically. The user never sees cloud-ops.
- **Enrollment.** Fully automatic. From the user's perspective, the node appears in the project's node pool within minutes of the "create dedicated node" request, already `Healthy`.
- **Who pays.** Credits burn at a **flat hourly rate** matching the size tier, for as long as the node is `Healthy`. The rate covers the whole envelope (compute + memory + included storage + included bandwidth). Usage staying inside the envelope burns no additional credits; usage strictly above the envelope (e.g. storage beyond the tier allowance) bills on top. The rate card lives outside this RFC.
- **Primary use cases.** Mid-market and up: teams who want predictable performance and isolation but have neither the appetite nor the expertise to run the dataplane themselves.

### 6.3 Bring-your-own (BYO) private node

- **Who operates.** The user (in their own AWS account or on-prem infrastructure).
- **Where it runs.** Inside the user's own environment. User bytes never leave.
- **Tenant isolation.** The whole node is the user's, full stop. There is no notion of other tenants on a BYO node.
- **What a node physically is in phase 1.** A **virtual machine**. On AWS, an EC2 instance. On-prem, a VM on whatever hypervisor the user runs (VMware, KVM, OpenStack, bare-metal KVM, …). Container-native distribution (Docker / Helm), AMI images, and appliance images are all phase-2+ additions.
- **Provisioning — two supported paths in phase 1**:
  1. **AWS integration-provisioned.** The user already has an RFC 0001 AWS integration attached to the project. They click "add a BYO node", pick a region from the integration's region list, pick an instance type (and supply the subnet id, VPC id, and any security-group constraints their account requires), and submit. Guepard's control plane — not the user's browser — calls the AWS SDK via the integration's credentials, launches the EC2 instance, and passes a cloudinit script as the instance user-data. The cloudinit script is Guepard-maintained and already exists today; it downloads the dataplane binary, seeds the enrollment token, and starts the node process. Once the node boots, it enrolls against the control plane and transitions `Enrolling → Healthy` autonomously. The user never types a command; they just watch the node appear in the project's node pool.
  2. **On-prem via CDKTF scripts.** For users who don't run on AWS (or don't want to use their AWS integration for this), Guepard ships a **CDKTF script bundle**. The user downloads the bundle from the "add a BYO node" flow, fills in a small `terraform.tfvars`-style file with their hypervisor endpoint + credentials + a region label (e.g. `on-prem-frankfurt`), and runs `cdktf deploy`. The CDKTF stack provisions a VM on their infrastructure, bakes in the Guepard enrollment token as user-data, and starts the node. Enrollment proceeds identically to the AWS path — the node dials home, Guepard recognises it by token, and it appears `Healthy` in the project's node pool. This is the phase-1 answer for VMware, OpenStack, bare-metal KVM, Hyper-V, and anything else that isn't an AWS account. GCP integration-provisioned is phase 2; GCP users can still use the CDKTF path in phase 1 or wait.
- **Enrollment.** Outbound-only. Once booted, the node itself dials the Guepard control plane via the REST enrollment endpoint, presenting the short-lived bootstrap token. The control plane returns a long-lived node identity and NATS + OTEL endpoint URLs. The node then maintains an outbound NATS connection for commands and events, and an outbound OTEL stream for telemetry. Guepard never opens a hole into the user's network.
- **Who pays.** Zero credits for the runtime: the user already pays a Guepard licence fee to run BYO at all, and the underlying VM / on-prem hardware is paid directly to their cloud provider or their ops team. AI agent tokens (which call Guepard-hosted LLMs even when the database is on a BYO node) remain credit-billed. This is the core economic differentiator of BYO and the key reason the enterprise story works.
- **Primary use cases.** Enterprises with regulated workloads, large-data users for whom egressing bytes out of their VPC is untenable, on-prem shops, air-gapped environments (where "air-gapped" really means "outbound 443 + NATS + OTEL allowed, inbound blocked").

### 6.4 Side-by-side summary

| Dimension                  | Public mutualised                 | Guepard-hosted private         | BYO private                                              |
| -------------------------- | --------------------------------- | ------------------------------ | -------------------------------------------------------- |
| Operator                   | Guepard ops                       | Guepard ops                    | User                                                     |
| Physical location          | Guepard Cloud                     | Guepard Cloud (VM)             | User's AWS account or on-prem                            |
| Tenant boundary            | Per-database container            | Whole VM                       | Whole VM                                                 |
| Granularity the user picks | Region                            | Region + size tier (S/M/L)     | Region + instance type + VPC/subnet (AWS) or hypervisor params (on-prem) |
| Provisioning actor         | None (pre-provisioned pool)       | Guepard                        | Guepard via AWS SDK + cloudinit, **or** user running a Guepard-shipped CDKTF script |
| Enrollment                 | N/A                               | Automatic                      | Outbound REST via bootstrap token, fully automatic from the user's perspective |
| Network trust              | Guepard-internal                  | Guepard-internal               | Outbound only from user's network                        |
| Pays credits for runtime   | Yes (usage-based)                 | Yes (flat hourly envelope)     | No (licence-only)                                        |
| Databases share a node     | Many, container-isolated          | Project-private                | Project-private                                          |
| Phase-1 regions            | US-East, EU-West                  | US-East, EU-West               | Any AWS region the user's integration supports, or any label for on-prem |
| Primary audience           | Trial / dev / small               | Mid-market                     | Enterprise / regulated / on-prem                         |

## 7. Control plane ↔ node communication

Three transports, all outbound from the node's perspective, work together:

- **REST — enrollment.** A one-shot call. The node uses a short-lived bootstrap token (issued by the control plane when the user clicked "add a BYO node" or when Guepard provisioned a hosted node) to POST its identity, its claimed region, its version, and any hardware attestations to the Guepard enrollment endpoint. The control plane responds with the node's permanent identity, a long-lived control credential, and the NATS + OTEL endpoint URLs to use. After the enrollment handshake, REST is not used for steady-state operations.
- **NATS — commands and events.** Once enrolled, the node connects outbound to the Guepard-operated NATS cluster using its control credential. It subscribes to a node-specific subject hierarchy to receive commands (create database, create branch, pull ingestion, drain, terminate, …) and publishes on another subject hierarchy to report lifecycle events (`node.enrolled`, `node.healthy`, `database.created`, `database.branch_created`, `ingestion.progress`, …). Commands are idempotent and carry a unique operation id so the control plane can reconcile if a command is delivered twice after a reconnect. (A `database.migrate` command is not part of the phase-1 command set; see §3.2.)
- **OTEL — telemetry.** The node pushes metrics, logs, and traces to a Guepard-hosted OTEL collector using the standard OTLP protocol. Nothing about this transport is Guepard-specific — any OTEL sidecar the user already runs would recognise it. The collector URL is handed to the node at enrollment time and is always HTTPS.

Public and Guepard-hosted private nodes speak the same three transports for consistency, even though they run inside Guepard's own network. That makes the node contract uniform and means the same observability and command-routing code works for all three modes.

**Why pull-model outbound-only.** For BYO in particular, the pull model is the decisive reason the enterprise path is tractable: the user's firewall rules only need to allow outbound HTTPS to the Guepard control plane and outbound TLS to the NATS cluster. There is no inbound rule, no exposed port, no VPN, no reverse tunnel from Guepard, and no STS AssumeRole dance to grant Guepard inbound reach.

## 8. Security and trust boundaries

- **For BYO nodes, Guepard never stores the user's bytes.** The node holds the GFS store on the user's disk. The control plane only sees operation metadata (a branch was created, an ingestion finished), OTEL telemetry (metrics, logs, traces — which may include diagnostic query fragments if the user opts in), and lifecycle events. The commit history, the row data, the schema, and the query results all live on the node and stay there.
- **For public and Guepard-hosted private nodes, Guepard is the custodian of the user's bytes** by definition, under whatever terms the user accepted when they signed up for Guepard Cloud. These modes are appropriate for any workload the user is willing to put on a third-party SaaS; they are *not* appropriate for workloads the user is not.
- **Credential handling, BYO AWS integration-provisioned path.** RFC 0001's `ISecretVault` holds the AWS credentials. The node-provisioning step reveals them briefly server-side to call the AWS SDK, then discards the revealed value. Raw credentials never leave the server and are never embedded in the cloudinit script (only the Guepard bootstrap token is). See RFC 0001 §10 for the credential lifecycle — this RFC inherits it.
- **The bootstrap token** issued for both the AWS-provisioned and CDKTF-provisioned BYO paths is short-lived (minutes, not hours), single-use, and signed so the enrollment endpoint can verify it without a database lookup. For the AWS path it is baked into the EC2 user-data by Guepard's server. For the CDKTF path it is displayed to the user exactly once in the UI and included in the script bundle they download — the user should not commit the bundle to version control with the token intact. If a token is intercepted, the worst case is an attacker enrolling a rogue node into the user's project, which would immediately be visible in the project's node pool and can be revoked.
- **NATS credentials** scoped per node. A compromised node's NATS credential gives an attacker the ability to publish events as that node and receive commands addressed to that node — but not to impersonate any other node, not to read other projects, and not to reach the control plane's internal APIs.
- **OTEL payloads** may contain sensitive content (SQL fragments in logs, query plans in traces). The default logging verbosity on nodes is "info" and excludes query text; users who bump verbosity accept the privacy tradeoff. The spec must document the exact default.
- **Destructive operations** — terminating a node, draining a node, attaching or detaching a node to the project — require the new **`nodes.manage`** permission. Creating a database on an already-attached node (the day-to-day developer action) requires the new **`nodes.use`** permission. This two-tier split stops developers from accidentally shutting the production node down while letting them still create dev databases on it.
- **Public dataplane multi-tenancy.** Per-database containers give hard CPU / memory / storage isolation, and the query endpoint is per-database. A compromised container can see its own database's bytes — the same bytes the user can see — and nothing else. The spec defines the exact container runtime and the storage driver; this RFC only commits to the isolation boundary.

## 9. UX surface and product integration

- **Node pool, project-level.** The nodes plugin app renders the project's node pool as a first-class page in the project shell sidebar, next to Datasources and Environments. Each row shows: slug, mode (BYO / hosted / public), region (and an `unverified` badge if declared + IP-geolocation disagrees), health, version, number of databases hosted, last seen. Clicking a row opens a detail view with lifecycle actions (drain, terminate, rename), an **"update available"** banner when a new Guepard version is published, metrics, and event history.
- **"Add a node" flow.** A single entry point with three branches:
  - **Public mutualised** — user picks a region (no silent default: the picker shows US-East and EU-West and requires an explicit choice). One click attaches the project to that region. No credentials, no provisioning, no wait.
  - **Guepard-hosted private** — user picks a region and a size tier (S / M / L). Guepard provisions a VM; the node appears `Healthy` in the pool within minutes.
  - **BYO** — the user sub-picks **AWS-integration-provisioned** or **On-prem CDKTF**. The AWS path asks for the integration, region, instance type, and VPC/subnet; Guepard provisions the EC2 VM via the AWS SDK. The CDKTF path hands the user a downloadable script bundle + a one-time bootstrap token and waits for the node to dial home.
- **Offline BYO nodes.** If a BYO node stops heartbeating, the UI marks it `Degraded` with a reason and timestamp. **The platform does not take any automatic action** — it does not move databases, does not auto-rescue, does not auto-terminate. The databases on the node are shown as unreachable on their detail pages with a link back to the degraded node. Recovery is always operator-initiated, matching the "your bytes never move without consent" promise central to BYO.
- **Database-creation handoff with RFC 0003.** When the user is in the environments workflow and reaches "create a Guepard database from this source", the node picker appears. It lists the project's currently attached nodes, grouped by mode, and lets the user pick one. If the project has no nodes yet, the node picker defers to the "add a node" flow and then returns to the database-creation flow with the newly-attached node pre-selected. This is the integration point RFC 0003 step 4 is waiting on.
- **Database → node badge.** Every place the UI shows a database (lists, detail pages, agent chats) carries a small badge showing the node it lives on and its region. Clicking the badge jumps to the node detail page. (There is no "move to another node" affordance in phase 1 — migration is explicitly out of scope; see §3.2.)
- **No node, no prompt.** A project without any nodes is a first-class state — the UI does not nag users to create one. The nodes page shows an empty-state explaining the three modes. The first nag happens when the user tries to actually create or ingest a database and doesn't have a node yet.

## 10. Credits, licensing, and the billing boundary

The billing story is simpler than it looks: **the Guepard licence pays for the software, credits pay for the cloud resources Guepard runs for the user.**

- **Public mutualised nodes** run on Guepard Cloud. Every hour of storage and every CPU-second of query compute, every ingestion run, every branch operation on a public node consumes credits. Exact rates are defined outside this RFC.
- **Guepard-hosted private nodes** run on Guepard Cloud. The hosted resource envelope consumes credits at a **flat hourly rate** tied to the tier (Small / Medium / Large), continuously for as long as the node is `Healthy`, regardless of whether databases are actively being queried. Usage strictly outside the envelope (e.g. storage beyond the tier allowance) bills on top. The user rented a box; the meter runs until they drain it.
- **BYO private nodes** run on the user's own cloud account or on-prem. Guepard does not bill credits for the runtime: the user already pays their Guepard licence fee to run BYO at all, and they pay their cloud provider directly for the VM / the disks / the network. Guepard's side of the ledger for BYO is a flat licence fee and nothing more.
- **AI agent token usage** (calls to LLMs on the user's behalf from Guepard-hosted agent runtime) consumes credits independently of node mode. An agent running against a BYO-hosted database still spends credits on every token it calls out to a model for — because the token call is a Guepard-hosted service, not something running on the user's node. This is the one remaining credit-cost for BYO users.
- **The licence fee itself is out of scope for this RFC.** It is a product / sales concern that lives above the platform. This RFC only states which axes of usage consume credits vs. are covered by the licence, not the pricing model.

The practical consequence is the user mental model: *"if you run it on Guepard's machines, you burn credits; if you run it on your machines, you don't; AI agents always burn credits because the model calls are ours."*

## 11. Rollout plan

| Phase | Scope                                                                                                                             | Artifacts                | Status |
| ----- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ------ |
| 1     | All three deployment modes ship uniformly. Node contract, enrollment (REST + NATS + OTEL), pull-model command/event transport, telemetry, project-scoped ownership, per-database attachment **pinned to creation node**, region attribute (US-East + EU-West), lifecycle state machine, UX. BYO = AWS integration (EC2 + cloudinit) + on-prem CDKTF. Hosted-private = S/M/L tiers at flat hourly rate. Public = per-database containers in two regions. | This RFC + spec          | Draft  |
| 2     | **Database migration + replication + HA.** First-class `database.migrate` operation (offline in phase 2, hot later). Primary + read-replica on a second node of the same project. In-place resize of hosted-private nodes. **GCP integration-provisioned BYO nodes**. Auto-rescue policies for degraded BYO nodes, gated on explicit user consent. | Phase 2 RFC              | Future |
| 3     | **Cross-node operations.** Clone a branch from node A onto node B. Multi-region databases. Cross-region migration with background replication. | Phase 3 RFC              | Future |
| 4     | **Org-level node pools.** A node attached once at the org and made available to many projects with per-project quotas. Node sharing policies. | Phase 4 RFC              | Future |
| 5     | **Node fleet ergonomics.** Auto-upgrade policies, rolling reboots, maintenance windows, auto-scaling of the public dataplane, alternative BYO delivery formats (Docker, Helm, AMI images, appliance images). | Phase 5 RFC              | Future |

Each phase is an independent RFC. Phase 1 ships all three deployment modes because skipping any of them would amputate the product story — a user with an enterprise compliance problem who cannot use BYO, or a trial user who cannot use public, walks away. The internal cost is shared because the node contract is one set of operations and all three modes implement the same set. Migration is deferred to phase 2 deliberately: it shares most of its implementation with replication (both stream GFS objects between nodes), and building them together is cheaper than building migration twice.

## 12. Resolved questions

The following questions were raised and resolved during the RFC review. They were open during early drafts; the answers are now the committed phase-1 position and the spec will follow them without further debate.

1. **Node size tiers for the hosted-private mode.** → Three fixed tiers: **Small / Medium / Large**, with concrete vCPU / memory / disk envelopes defined in the spec. Continuous / parameterised sizing is rejected as too hard to price and support; adding more tiers is a phase-2+ adjustment.
2. **Metering model for hosted-private nodes.** → **Flat hourly rate** tied to the tier, as long as the node is `Healthy`. Usage strictly outside the envelope (storage beyond allowance, etc.) bills on top. Rejected: usage-based-only (contradicts the "dedicated box" positioning) and per-operation metering (punishes heavy branchers).
3. **How many public regions does phase 1 ship?** → **Two: US-East and EU-West.** One covers the US-heavy SaaS base, the other covers GDPR-sensitive EU customers. Additional regions are added based on measurable demand; Asia-Pacific is expected to be the first phase-2 addition.
4. **`nodes.manage` vs `nodes.use` permission split.** → **Two tiers.** `nodes.manage` for create / attach / detach / drain / terminate / update; `nodes.use` for creating a database on an already-attached node. Three-tier (admin / operator / user) is rejected as over-engineering for phase 1; single-tier is rejected because it forces developers to be node operators.
5. **Node identity in the data model.** → **UUID internally + user-chosen slug unique per project** (auto-suffixed on collision). Matches the existing datasources / projects conventions. URLs use the slug.
6. **Node version policy.** → **User-triggered updates** with an "update available" banner on the node detail view. Auto-update is deferred to phase 5; the phase-1 enterprise story cannot rely on "Guepard deploys code into your environment without asking."
7. **Default region for a public attachment.** → **No default. Always prompt.** The user must pick US-East or EU-West explicitly. This avoids silently storing data in the wrong jurisdiction and forces a deliberate choice at the moment it matters.
8. **BYO self-install: supported runtimes.** → **Phase 1 BYO = VMs.** Two delivery formats: (a) **AWS-integration-provisioned EC2** via the AWS SDK + existing cloudinit scripts (Guepard calls the SDK with user-supplied VPC / subnet / instance type), and (b) **on-prem CDKTF scripts** shipped from the console for any non-AWS hypervisor. Docker, Helm, static binaries, AMI images, and appliance images are all phase-2+.
9. **Databases on an offline BYO node.** → **No automatic action.** The node is marked `Degraded`; its databases are shown as unreachable with a link back to the node. Recovery is always operator-initiated. Auto-rescue (moving databases to another node) contradicts the "your bytes never move without consent" promise and is rejected even in phase 2 without an explicit user policy.
10. **Region verification for on-prem CDKTF nodes.** → **Accept as declared, cross-check against IP geolocation during enrollment, warn on mismatch but do not block.** Behind-VPN, NAT, and private-network deployments are legitimate and common on this path; refusing enrollment there would lock out the exact audience BYO is built for. The node detail view surfaces an `unverified` badge whenever the two disagree.
11. **Migration billing boundary.** → Moot. **Database migration between nodes is not a phase-1 feature** (see §3.2 and §5.3). The question resurfaces in phase 2 when migration lands; the phase-2 RFC will answer it then.
12. **Node slug uniqueness scope.** → **Per project** (resolved together with Q5). Consistent with datasources. Per-org uniqueness is deferred to phase 4's org-level node pools RFC if it's still needed then.
13. **`nodes.integration_id` foreign key in phase 1.** → **Yes, add as a nullable FK in phase 1** pointing at `integration_connections.id` (from RFC 0001). AWS-integration-provisioned BYO nodes carry the FK; every other mode leaves it `NULL`. Keeps provenance queryable from day one and avoids a later-phase schema migration.

## 12b. Follow-up questions for the spec

A few genuinely new questions surfaced during the review and belong to the spec, not to this RFC. Listed here so they do not get lost.

- **Concrete vCPU / memory / disk envelopes for the S / M / L tiers**, plus the hourly credit rate for each. Product pricing concern — lives in the spec alongside the rate card.
- **Phase-1 hypervisor coverage for the on-prem CDKTF path.** CDKTF has providers for many targets; the spec decides whether phase 1 ships one reference flavour (e.g. bare-metal KVM) or several (VMware, OpenStack, Hyper-V). A shipping default + documentation for the others is a reasonable middle ground.
- **Cloudinit script maintenance location.** The existing cloudinit scripts referenced in §6.3 live outside this repo today; the spec confirms where they land (a new package or an external repo pinned by commit) and how they are versioned against the node dataplane binary.
- **Update semantics for the AWS-integration-provisioned BYO path.** When a new node version is published, does the banner offer an in-place update (re-run cloudinit on the existing EC2 VM) or does the user have to terminate and re-create? Proposal: in-place update in phase 1, because the alternative forces a re-ingest cycle that migration is supposed to enable — and migration is deferred.
- **Node slug naming collisions between an `unverified` on-prem node and a real AWS node.** Both live in the same per-project namespace. The spec confirms whether the `unverified` badge influences auto-suffix logic or is purely visual.

## 13. Alternatives considered

- **Database migration between nodes in phase 1.** Tempting because it unlocks the "graduate from public → hosted-private → BYO" story as a first-class in-place upgrade. Deferred to phase 2. Migration shares most of its implementation with replication (both stream GFS objects between nodes, both need to coordinate a cutover, both need to reason about branch-history consistency on the receiving side), and shipping them together in phase 2 is cheaper than shipping migration twice. The phase-1 cost is that graduation between modes requires creating a new database on the new node and re-ingesting the source — acceptable for phase 1 because the graduation flow is not the critical path for either the enterprise or the trial story.
- **Skipping the public mutualised dataplane in phase 1, shipping only private nodes.** Rejected. It leaves the trial experience at "request a VM and wait for Guepard ops", which is a viable enterprise story but a fatal onboarding story. Most users who bounce off the product will have bounced before they could get to a node at all.
- **Skipping the BYO mode in phase 1, shipping only Guepard-hosted modes.** Rejected on product grounds. BYO is the answer to the single question enterprise buyers ask first: *"where does my data live?"* Without a real BYO story on day one, every enterprise conversation has to be deferred by a quarter.
- **Guepard-hosted private skipped, shipping only public + BYO.** Rejected because it forces mid-market users into an all-or-nothing choice: either share with strangers on the public pool or run their own dataplane. The hosted-private tier is the answer for customers who want dedicated resources without cloud-ops.
- **Docker / Helm / static binary as the phase-1 BYO delivery format.** Considered and rejected for phase 1. A single `docker run` is easier on the engineering side but asks the enterprise operator to produce their own VM / container host, and does not match how the existing Guepard cloudinit scripts are shaped. Phase 1 is VMs (AWS EC2 via integration; on-prem via CDKTF); Docker / Helm / AMI / appliance images are all phase-5 additions once the VM-based contract has stabilised.
- **GCP integration-provisioned BYO in phase 1.** Deferred to phase 2. RFC 0001 already supports a GCP integration, but wiring the Guepard-side provisioning flow against GCE / Cloud Run is materially more work than the AWS SDK + cloudinit path (which already exists). GCP users in phase 1 can still run on-prem CDKTF against a GCE VM they manage themselves, or wait for phase 2.
- **Push-model control plane ↔ node link** (Guepard dials into the node). Rejected for BYO on firewall / compliance grounds — every enterprise firewall blocks unsolicited inbound from SaaS control planes, and convincing security teams to open one is a months-long exercise. The pull model (REST enrollment + NATS subscription + OTEL push, all outbound) is the only path that doesn't turn enrollment into a procurement battle.
- **One node per project (not many).** Rejected as too inflexible. The whole product story about running dev on public and prod on BYO inside the same project depends on a project being able to hold multiple attached nodes at once — even though databases themselves are pinned in phase 1.
- **Auto-rescue policy for offline BYO nodes.** Considered. Would have been a pure UX improvement — "your node is down, we'll move the databases to another attached node so you don't lose access" — but rejected because it forces the platform to move bytes without user consent, contradicting the BYO data-locality promise. The phase-1 behaviour is "node goes `Degraded`, no automatic action, operator decides." Auto-rescue comes back as an optional policy (opt-in per project) in phase 2.
- **Cross-node replication in phase 1.** Tempting, because it makes nodes look more like a real dataplane, but doubles the surface area of every operation (every command has to consider "does this need to fan out") and forces a commitment to a replication protocol before we've learned what users actually want. Deferred to phase 2 alongside migration.
- **Treating the three modes as three different entities.** Rejected. Splitting the concept would duplicate every piece of UI, every domain service, every NATS subject, and every telemetry schema three times — and would leave us with the three-way divergence problem ("branch works on public but not on BYO") that this whole design exists to prevent.

## 14. References

- `docs/rfcs/0001-integrations.md` — Integration primitive; BYO integration-provisioned nodes are the phase-2 target of that RFC.
- `docs/rfcs/0003-environments.md` — Source-database ingestion and clone workflow; first consumer of nodes.
- `.claude/rules/hexagonal-architecture.md` — Layering rules the spec will be measured against.
- `.claude/rules/database.md`, `apps/web/supabase/CLAUDE.md` — RLS, permission enum, and migration conventions for any new tables the spec introduces.
- `.claude/rules/i18n.md` — String-handling rules for the nodes plugin app.
- `packages/agent-factory-sdk/` — Agent runtime; indirect consumer of nodes via registered databases.
- OpenTelemetry OTLP specification — observability transport used for node → Guepard telemetry.
- NATS documentation — control transport used for command delivery and event reporting.

---

### Review checklist for the author

- [ ] Does §1 make it obvious that a node is a self-contained dataplane and that the three modes are operational wrappers around one contract — not three separate subsystems?
- [ ] Does §2 make clear that nodes are the missing layer *under* environments and *under* the git-like database primitive, and that RFC 0003 is blocked on this RFC landing?
- [ ] Is the BYO "licence-only, no runtime credits" position in §10 defensible as the phase-1 commercial model, or does finance need to reshape it before the spec?
- [ ] Is the per-database container isolation promise in §6.1 strong enough to stand up to an enterprise security review, or does the public dataplane need a stronger boundary (e.g. micro-VMs) on day one?
- [ ] Does the phase-1 scope cut to pin databases to their creation node (no migration) survive a product-team pass, or will the "graduate between modes without re-ingesting" story be raised as a phase-1 blocker during the spec review?
- [ ] Is the AWS-only BYO integration-provisioning scope for phase 1 acceptable, given that RFC 0001 phase 1 covers both AWS and GCP? The gap is intentional (GCP provisioning is materially different from AWS) but needs explicit product-team acknowledgment.
- [ ] Does the rollout plan's split between phase-1 (three modes, pinned databases, AWS + on-prem BYO) and phase-2 (migration + replication + HA + GCP BYO) match engineering capacity for the next two quarters?
- [ ] §12b's five follow-up questions for the spec — should any of them actually block the RFC instead of being pushed down to the spec?
