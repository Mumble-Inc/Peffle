"use client";

import { useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Input,
  Select,
  Surface,
  Tabs,
  TabPanel,
  Toast,
  Tooltip,
  SettlementLine,
  SettlementGate,
  DataTable,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableCell,
} from "@/components/ui/design-system";
import { GlassSurface } from "@/components/liquid-glass";

export function DesignSystemLab() {
  const [tab, setTab] = useState("controls");

  return (
    <div className="mx-auto max-w-[var(--rf-measure-content)] px-[var(--rf-gutter-mobile)] py-12 md:px-[var(--rf-gutter-desktop)] md:py-16">
      <header className="mb-10 max-w-prose">
        <p className="rf-type-meta uppercase tracking-wide text-accent">Peffle foundation</p>
        <h1 className="rf-type-h1 mt-2 text-ink">Design system lab</h1>
        <p className="rf-type-body mt-3 text-ink-soft">
          Global tokens and shared components. Content is solid; controls may use glass with context.
        </p>
      </header>

      <Tabs
        tabs={[
          { id: "controls", label: "Controls" },
          { id: "material", label: "Material" },
          { id: "data", label: "Data" },
        ]}
        activeId={tab}
        onChange={setTab}
      />

      <TabPanel id="controls" labelledBy="rf-tab-controls" hidden={tab !== "controls"}>
        <div className="grid gap-8 lg:grid-cols-2">
          <Surface>
            <h2 className="rf-type-h4 text-ink">Buttons</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
              <Button loading>Loading</Button>
            </div>
          </Surface>
          <Surface>
            <h2 className="rf-type-h4 text-ink">Inputs</h2>
            <div className="mt-4 grid gap-3">
              <Input placeholder="Merchant policy name" aria-label="Policy name" />
              <Select aria-label="Channel">
                <option>Desk</option>
                <option>Admin</option>
              </Select>
            </div>
          </Surface>
          <Surface>
            <h2 className="rf-type-h4 text-ink">Badges</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge>Neutral</Badge>
              <Badge tone="accent">Accent</Badge>
              <Badge tone="success">Approved</Badge>
              <Badge tone="warning">Awaiting</Badge>
              <Badge tone="blocked">Blocked</Badge>
              <Badge tone="danger">Error</Badge>
            </div>
          </Surface>
          <Surface>
            <h2 className="rf-type-h4 text-ink">Alerts</h2>
            <div className="mt-4 grid gap-3">
              <Alert tone="info" title="Policy check running">
                Verifying discount ceiling against Northline rules.
              </Alert>
              <Alert tone="blocked" title="Checkout blocked">
                Agent requested 22% off; ceiling is 15%.
              </Alert>
            </div>
          </Surface>
        </div>
      </TabPanel>

      <TabPanel id="material" labelledBy="rf-tab-material" hidden={tab !== "material"}>
        <div className="grid gap-8">
          <section className="rf-surface-canvas rounded-[var(--rf-radius-panel)] border border-line p-6">
            <h2 className="rf-type-h4 text-ink">L0 canvas</h2>
            <p className="mt-2 rf-type-body text-ink-soft">Opaque content surface. No blur.</p>
          </section>

          <section className="rf-surface-section rounded-[var(--rf-radius-panel)] border border-line p-6">
            <h2 className="rf-type-h4 text-ink">L1 section</h2>
            <p className="mt-2 rf-type-body text-ink-soft">Structural band behind catalog-style groupings.</p>
          </section>

          <div
            className="rf-env-wash rounded-[var(--rf-radius-panel)] p-8 md:p-10"
            data-testid="glass-env-wash"
          >
            <p className="rf-type-meta text-muted">Environmental atmosphere (#e8f0fe field, not glass tint)</p>
            <GlassSurface
              level="functional"
              purpose="lab-nav"
              className="mt-4 p-6"
              data-testid="glass-l2"
            >
              <p className="rf-type-ui text-ink">L2 functional glass over wash</p>
            </GlassSurface>
            <div className="mt-6">
              <SettlementLine
                steps={[
                  { id: "1", label: "Intent", state: "done" },
                  { id: "2", label: "Policy", state: "active" },
                  { id: "3", label: "Pay", state: "idle" },
                ]}
              />
            </div>
          </div>

          <GlassSurface level="elevated" purpose="lab-approval" className="p-6" data-testid="glass-l3">
            <p className="rf-type-ui font-medium text-ink">L3 elevated panel (one dominant L3 per viewport)</p>
            <p className="mt-2 rf-type-body text-ink-soft">Approval or hero-stage class surfaces.</p>
          </GlassSurface>

          <div className="rf-focus-l4 inline-flex min-h-11 items-center px-4 rf-type-ui" data-testid="glass-l4">
            L4 focused control
          </div>

          <Toast title="Payment captured" detail="₹12,450 settled via Razorpay." tone="success" />
          <Tooltip content="Settlement teal marks allowed actions">
            <Button variant="ghost">Hover for tooltip</Button>
          </Tooltip>

          <SettlementGate title="Guardrail engaged" reason="Discount exceeds merchant ceiling." />
          <SettlementGate
            elevated
            title="Gate focal"
            reason="Policy boundary active; line stops here."
          />
        </div>
      </TabPanel>

      <TabPanel id="data" labelledBy="rf-tab-data" hidden={tab !== "data"}>
        <DataTable>
          <TableHead>
            <tr>
              <TableHeaderCell>Order</TableHeaderCell>
              <TableHeaderCell>Amount</TableHeaderCell>
              <TableHeaderCell>State</TableHeaderCell>
            </tr>
          </TableHead>
          <tbody>
            <TableRow selected>
              <TableCell className="rf-mono-value">NL-1042</TableCell>
              <TableCell className="rf-mono-value">₹8,999</TableCell>
              <TableCell>
                <Badge tone="success">Settled</Badge>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="rf-mono-value">NL-1043</TableCell>
              <TableCell className="rf-mono-value">₹2,199</TableCell>
              <TableCell>
                <Badge tone="blocked">Blocked</Badge>
              </TableCell>
            </TableRow>
          </tbody>
        </DataTable>
      </TabPanel>
    </div>
  );
}
