"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ROLE_LABELS, USER_ROLES } from "@/lib/constants";
import { adminSetUserRoleAction } from "@/server/actions/admin";

export function UserRoleSelect({ userId, role, disabled }: { userId: string; role: string; disabled?: boolean }) {
  const router = useRouter();
  async function change(value: string) {
    const result = await adminSetUserRoleAction(userId, value);
    if (!result.ok) toast.error(result.error);
    else {
      toast.success("Role updated");
      router.refresh();
    }
  }
  return (
    <Select value={role} onValueChange={(value) => void change(value)} disabled={disabled}>
      <SelectTrigger size="sm" className="w-36" aria-label="Change role">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {USER_ROLES.map((value) => (
          <SelectItem key={value} value={value}>
            {ROLE_LABELS[value]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
