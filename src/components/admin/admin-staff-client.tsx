"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  Button,
  DataTable,
  EmptyState,
  Input,
  LoadingState,
  PageHeader,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/admin/admin-ui";

type StaffMember = {
  id: string;
  email: string;
  createdAt: string;
  accountVerified: boolean;
  accountEmail: string | null;
};

export function AdminStaffClient() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const loadStaff = useCallback(async () => {
    const response = await fetch("/api/admin/staff", { credentials: "include" });
    if (response.status === 403) {
      setForbidden(true);
      setLoading(false);
      return;
    }
    if (!response.ok) {
      setError("Could not load staff list");
      setLoading(false);
      return;
    }
    const payload = (await response.json()) as { staff: StaffMember[] };
    setStaff(payload.staff);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadStaff();
  }, [loadStaff]);

  async function onAdd(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/staff", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not add staff email");
      }
      setEmail("");
      await loadStaff();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not add staff email");
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(id: string) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/staff", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not remove staff email");
      }
      await loadStaff();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not remove staff email");
    } finally {
      setBusy(false);
    }
  }

  if (forbidden) {
    return (
      <EmptyState
        title="Staff access"
        description="Administrator access is required to manage staff."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff"
        description="Add email addresses that may receive staff access after the user registers and verifies ownership. Adding an email does not create an account."
      />
      <form className="flex flex-wrap gap-2" onSubmit={onAdd}>
        <Input
          type="email"
          placeholder="staff@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          className="min-w-[16rem] flex-1"
          aria-label="Staff email"
        />
        <Button type="submit" loading={busy}>
          Add staff email
        </Button>
      </form>
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {loading ? (
        <LoadingState label="Loading staff…" />
      ) : staff.length === 0 ? (
        <EmptyState title="No staff emails" description="Add an email to allow staff access after verification." />
      ) : (
        <DataTable>
          <TableHead>
            <tr>
              <TableHeaderCell>Email</TableHeaderCell>
              <TableHeaderCell>Verified account</TableHeaderCell>
              <TableHeaderCell>Added</TableHeaderCell>
              <TableHeaderCell>Actions</TableHeaderCell>
            </tr>
          </TableHead>
          <tbody>
            {staff.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="font-medium">{member.email}</TableCell>
                <TableCell className="text-muted">
                  {member.accountVerified ? "Yes" : "No account yet"}
                </TableCell>
                <TableCell className="text-muted">
                  {new Date(member.createdAt).toLocaleDateString("en-IN")}
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="secondary"
                    loading={busy}
                    onClick={() => void onRemove(member.id)}
                  >
                    Remove
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </DataTable>
      )}
    </div>
  );
}
