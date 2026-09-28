"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormError, FormField, fieldA11y } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/ui/user-avatar";
import { ROLE_LABELS } from "@/lib/constants";
import { updateProfileAction, uploadAvatarAction } from "@/server/actions/profile";
import { profileSchema, type ProfileFormValues, type ProfileInput } from "@/validations/profile";

interface ProfileFormProps {
  user: {
    name: string | null;
    email: string;
    image: string | null;
    role: "BUYER" | "SELLER" | "AGENT" | "ADMIN";
    profile: { phone: string | null; bio: string | null; company: string | null; location: string | null; website: string | null } | null;
  };
}

export function ProfileForm({ user }: ProfileFormProps) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [avatar, setAvatar] = React.useState(user.image);
  const [uploading, setUploading] = React.useState(false);
  const fileInput = React.useRef<HTMLInputElement>(null);

  const form = useForm<ProfileFormValues, unknown, ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user.name ?? "",
      role: user.role === "ADMIN" ? "AGENT" : user.role,
      phone: user.profile?.phone ?? "",
      bio: user.profile?.bio ?? "",
      company: user.profile?.company ?? "",
      location: user.profile?.location ?? "",
      website: user.profile?.website ?? "",
    },
  });
  const errors = form.formState.errors;

  async function onSubmit(values: ProfileInput) {
    setError(null);
    const result = await updateProfileAction(values);
    if (!result.ok) {
      setError(result.error);
      for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) form.setError(field as keyof ProfileFormValues, { message: messages[0] });
      return;
    }
    toast.success("Profile updated");
    router.refresh();
  }

  async function onAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const result = await uploadAvatarAction(formData);
    setUploading(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setAvatar(result.data.url);
    toast.success("Avatar updated");
    router.refresh();
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6" noValidate>
      <FormError message={error} />
      <div className="flex items-center gap-4">
        <UserAvatar name={user.name} image={avatar} className="size-20 text-xl" />
        <div className="flex flex-col gap-2">
          <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" onChange={onAvatarChange} aria-label="Upload avatar" />
          <Button type="button" variant="outline" size="sm" loading={uploading} onClick={() => fileInput.current?.click()}>
            <Camera /> Change photo
          </Button>
          <p className="text-xs text-muted-foreground">JPEG, PNG, WebP or AVIF up to 8 MB.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="name" label="Full name" error={errors.name?.message} required>
          <Input {...fieldA11y("name", errors.name?.message)} {...form.register("name")} />
        </FormField>
        <FormField id="email" label="Email">
          <Input id="email" value={user.email} disabled readOnly />
        </FormField>
        <FormField id="role" label="I am a" error={errors.role?.message} description={user.role === "ADMIN" ? "Administrators keep their admin role." : undefined}>
          <Controller
            control={form.control}
            name="role"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={user.role === "ADMIN"}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["BUYER", "SELLER", "AGENT"] as const).map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
        <FormField id="phone" label="Phone number" error={errors.phone?.message}>
          <Input type="tel" autoComplete="tel" placeholder="+1 555 0100" {...fieldA11y("phone", errors.phone?.message)} {...form.register("phone")} />
        </FormField>
        <FormField id="company" label="Agency or company" error={errors.company?.message}>
          <Input autoComplete="organization" {...fieldA11y("company", errors.company?.message)} {...form.register("company")} />
        </FormField>
        <FormField id="location" label="Location" error={errors.location?.message}>
          <Input placeholder="Austin, TX" {...fieldA11y("location", errors.location?.message)} {...form.register("location")} />
        </FormField>
        <FormField id="website" label="Website" error={errors.website?.message} className="sm:col-span-2">
          <Input type="url" placeholder="https://" {...fieldA11y("website", errors.website?.message)} {...form.register("website")} />
        </FormField>
        <FormField id="bio" label="About you" error={errors.bio?.message} className="sm:col-span-2" description="Shown on your public profile and listings.">
          <Textarea rows={4} {...fieldA11y("bio", errors.bio?.message, true)} {...form.register("bio")} />
        </FormField>
      </div>
      <div className="flex justify-end">
        <Button type="submit" loading={form.formState.isSubmitting}>
          Save changes
        </Button>
      </div>
    </form>
  );
}
