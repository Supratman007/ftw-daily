import { AccountShell } from "@/components/account/AccountShell";

/** Indonesian counterpart of src/app/account/layout.tsx. */
export default async function AccountLayoutId({ children }: { children: React.ReactNode }) {
  return <AccountShell locale="id">{children}</AccountShell>;
}
