import type { NextConfig } from "next";

// Every product/vehicle photo an admin uploads lands in Supabase
// Storage's public bucket (see ProductForm.tsx's handleFileChange),
// always under this one project's storage host -- so this is the only
// remote host next/image ever needs to be allowed to optimize.
// Deliberately derived from the same env var the rest of the app
// already uses to talk to Supabase, rather than hardcoding the project
// ref, so this never drifts if the project URL ever changes.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : undefined;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseHostname
      ? [
          {
            protocol: "https",
            hostname: supabaseHostname,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
