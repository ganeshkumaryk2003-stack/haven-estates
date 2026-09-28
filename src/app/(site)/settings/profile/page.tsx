import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/settings/profile-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { getUserWithProfile } from "@/server/services/users";

export const metadata: Metadata = { title: "Profile settings" };

export default async function ProfileSettingsPage() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) redirect("/login?callbackUrl=/settings/profile");
  const user = await getUserWithProfile(sessionUser.id);
  if (!user) redirect("/login");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Public profile</CardTitle>
        <CardDescription>This information appears on your listings and public profile page.</CardDescription>
      </CardHeader>
      <CardContent>
        <ProfileForm
          user={{
            name: user.name,
            email: user.email,
            image: user.image,
            role: user.role,
            profile: user.profile
              ? { phone: user.profile.phone, bio: user.profile.bio, company: user.profile.company, location: user.profile.location, website: user.profile.website }
              : null,
          }}
        />
      </CardContent>
    </Card>
  );
}
