// Plain, serializable shapes passed from server components/actions to client components.
// Enum-like fields use string literal unions that mirror the Prisma enums.

import type {
  AreaUnit,
  ConnectionStatus,
  ContactMethod,
  EnquiryStatus,
  FinancingMethod,
  FurnishedStatus,
  ListingType,
  NotificationType,
  OfferStatus,
  PaymentStatus,
  PropertyStatus,
  PropertyType,
  ReservationStatus,
  UserRole,
} from "@/generated/prisma/enums";

export interface UserSummaryDTO {
  id: string;
  name: string | null;
  image: string | null;
  role: UserRole;
  company?: string | null;
  emailVerified?: boolean;
}

export interface PropertyImageDTO {
  id: string;
  url: string;
  storageKey: string;
  alt: string | null;
  width: number | null;
  height: number | null;
  position: number;
}

export interface AmenityDTO {
  id: string;
  slug: string;
  name: string;
  category: string | null;
}

export interface PropertyCardDTO {
  id: string;
  slug: string;
  title: string;
  listingType: ListingType;
  propertyType: PropertyType;
  status: PropertyStatus;
  price: number;
  currency: string;
  address: string;
  city: string;
  state: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  bedrooms: number;
  bathrooms: number;
  parkingSpaces: number;
  interiorArea: number | null;
  areaUnit: AreaUnit;
  featured: boolean;
  coverImage: { url: string; alt: string | null } | null;
  publishedAt: string | null;
  createdAt: string;
  favoriteCount: number;
  viewCount: number;
  isFavorited: boolean;
  ownerId: string;
}

export interface PropertyDetailDTO extends PropertyCardDTO {
  description: string;
  depositAmount: number;
  postalCode: string;
  lotArea: number | null;
  yearBuilt: number | null;
  furnished: FurnishedStatus;
  availableFrom: string | null;
  floorPlanUrl: string | null;
  videoUrl: string | null;
  virtualTourUrl: string | null;
  images: PropertyImageDTO[];
  amenities: AmenityDTO[];
  owner: UserSummaryDTO & { createdAt: string; phone: string | null; location: string | null; bio: string | null };
  updatedAt: string;
  rejectionReason: string | null;
  counts: { enquiries: number; offers: number; favorites: number };
}

export interface EnquiryDTO {
  id: string;
  subject: string;
  message: string;
  phone: string | null;
  preferredContact: ContactMethod;
  status: EnquiryStatus;
  createdAt: string;
  property: { id: string; slug: string; title: string; coverImage: string | null };
  sender: UserSummaryDTO & { email?: string };
  recipient: UserSummaryDTO;
}

export interface ConnectionDTO {
  id: string;
  status: ConnectionStatus;
  lastInteractionAt: string;
  createdAt: string;
  otherUser: UserSummaryDTO & { location: string | null };
  role: "buyer" | "seller";
  properties: { id: string; slug: string; title: string }[];
  conversationId: string | null;
  blockedByMe: boolean;
  archivedByMe: boolean;
}

export interface MessageAttachmentDTO {
  id: string;
  url: string;
  name: string;
  contentType: string;
  size: number;
  kind: "IMAGE" | "DOCUMENT";
}

export interface MessageDTO {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  attachments: MessageAttachmentDTO[];
}

export interface ConversationSummaryDTO {
  id: string;
  otherUser: UserSummaryDTO;
  property: { id: string; slug: string; title: string; coverImage: string | null } | null;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
  blocked: boolean;
}

export interface ConversationDetailDTO extends ConversationSummaryDTO {
  otherLastReadAt: string | null;
  messages: MessageDTO[];
  hasMore: boolean;
}

export interface OfferDTO {
  id: string;
  amount: number;
  currency: string;
  financing: FinancingMethod | null;
  conditions: string | null;
  message: string | null;
  expiresAt: string;
  status: OfferStatus;
  counterAmount: number | null;
  counterMessage: string | null;
  counteredAt: string | null;
  respondedAt: string | null;
  createdAt: string;
  property: { id: string; slug: string; title: string; coverImage: string | null; price: number; status: PropertyStatus; listingType: ListingType };
  buyer: UserSummaryDTO;
  seller: UserSummaryDTO;
  reservationId: string | null;
}

export interface ReservationDTO {
  id: string;
  reference: string;
  depositAmount: number;
  currency: string;
  status: ReservationStatus;
  paidAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  property: { id: string; slug: string; title: string; coverImage: string | null; price: number; listingType: ListingType };
  buyer: UserSummaryDTO;
  seller: UserSummaryDTO;
  offer: { id: string; amount: number; counterAmount: number | null };
  payments: { id: string; status: PaymentStatus; amount: number; receiptUrl: string | null; createdAt: string }[];
}

export interface NotificationDTO {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
