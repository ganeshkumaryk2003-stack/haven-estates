import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, getInitials } from "@/lib/utils";

interface UserAvatarProps {
  name?: string | null;
  image?: string | null;
  className?: string;
}

export function UserAvatar({ name, image, className }: UserAvatarProps) {
  return (
    <Avatar className={cn(className)}>
      {image ? <AvatarImage src={image} alt={name ?? "User avatar"} /> : null}
      <AvatarFallback aria-label={name ?? "User"}>{getInitials(name)}</AvatarFallback>
    </Avatar>
  );
}
