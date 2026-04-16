"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { Toaster } from "sonner";

/** Shared palette — Clerk v7 uses colorForeground/colorMutedForeground; deprecated colorText* alone can look wrong in User Profile. */
const clerkVariables = {
  colorPrimary: "#A855F7",
  colorPrimaryForeground: "#FFFFFF",
  colorBackground: "#18181B",
  colorForeground: "#FAFAFA",
  colorMutedForeground: "#A1A1AA",
  colorMuted: "#27272A",
  colorInput: "#27272A",
  colorInputForeground: "#FAFAFA",
  colorNeutral: "#E4E4E7",
  colorBorder: "#3F3F46",
  borderRadius: "0.75rem",
} as const;

const sharedElements = {
  card: {
    backgroundColor: "#18181B",
    border: "1px solid #27272A",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
  },
  headerTitle: {
    color: "#FAFAFA",
  },
  headerSubtitle: {
    color: "#A1A1AA",
  },
  socialButtonsBlockButton: {
    backgroundColor: "#27272A",
    border: "1px solid #3F3F46",
    color: "#FAFAFA",
    "&:hover": {
      backgroundColor: "#3F3F46",
    },
  },
  socialButtonsBlockButtonText: {
    color: "#FAFAFA",
  },
  formFieldLabel: {
    color: "#D4D4D8",
  },
  formFieldInput: {
    backgroundColor: "#27272A",
    border: "1px solid #3F3F46",
    color: "#FAFAFA",
    "&::placeholder": {
      color: "#71717A",
    },
  },
  formButtonPrimary: {
    backgroundColor: "#A855F7",
    color: "#FFFFFF",
    "&:hover": {
      backgroundColor: "#9333EA",
    },
  },
  footerActionLink: {
    color: "#A855F7",
    "&:hover": {
      color: "#C084FC",
    },
  },
  footerActionText: {
    color: "#A1A1AA",
  },
  dividerLine: {
    backgroundColor: "#3F3F46",
  },
  dividerText: {
    color: "#71717A",
  },
  identityPreview: {
    backgroundColor: "#27272A",
    border: "1px solid #3F3F46",
  },
  identityPreviewText: {
    color: "#FAFAFA",
  },
  identityPreviewEditButton: {
    color: "#A855F7",
  },
  formFieldSuccessText: {
    color: "#22C55E",
  },
  formFieldErrorText: {
    color: "#EF4444",
  },
  alertText: {
    color: "#FAFAFA",
  },
  formResendCodeLink: {
    color: "#A855F7",
  },
  otpCodeFieldInput: {
    backgroundColor: "#27272A",
    border: "1px solid #3F3F46",
    color: "#FAFAFA",
  },
  userButtonPopoverCard: {
    backgroundColor: "#18181B",
    border: "1px solid #27272A",
  },
  userButtonPopoverActionButton: {
    color: "#FAFAFA",
  },
  userButtonPopoverActionButtonText: {
    color: "#FAFAFA",
  },
  userButtonPopoverFooter: {
    borderTop: "1px solid #27272A",
  },
  /** Account / User profile */
  navbar: {
    color: "#FAFAFA",
  },
  navbarButtonText: {
    color: "#D4D4D8",
  },
  navbarButtonText__active: {
    color: "#EDE9FE",
  },
  profileSectionTitleText: {
    color: "#E4E4E7",
  },
  profileSectionSubtitleText: {
    color: "#A1A1AA",
  },
  userPreviewMainIdentifierText: {
    color: "#FAFAFA",
  },
  userPreviewSecondaryIdentifier: {
    color: "#D4D4D8",
  },
  userPreviewSecondaryIdentifierText: {
    color: "#D4D4D8",
  },
  lineItemsDescriptionText: {
    color: "#E4E4E7",
  },
  menuButton: {
    color: "#A1A1AA",
  },
  menuButtonEllipsis: {
    color: "#A1A1AA",
  },
  modalContent: {
    color: "#FAFAFA",
  },
  page: {
    color: "#FAFAFA",
  },
  badge__primary: {
    color: "#FAFAFA",
  },
} as const;

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: { ...clerkVariables },
        elements: {
          ...sharedElements,
        },
        /** Modal opened from UserButton (“Manage account”) — scope extra contrast here too */
        userProfile: {
          variables: { ...clerkVariables },
          elements: {
            navbar: { color: "#FAFAFA" },
            navbarButtonText: { color: "#D4D4D8" },
            profileSectionTitleText: { color: "#E4E4E7" },
            profileSectionSubtitleText: { color: "#A1A1AA" },
            userPreviewMainIdentifierText: { color: "#FAFAFA" },
            userPreviewSecondaryIdentifierText: { color: "#D4D4D8" },
            lineItemsDescription: { color: "#E4E4E7" },
            lineItemsDescriptionText: { color: "#E4E4E7" },
            menuButton: { color: "#A1A1AA" },
            menuButtonEllipsis: { color: "#A1A1AA" },
            modalContent: { color: "#FAFAFA" },
            page: { color: "#FAFAFA" },
            badge__primary: { color: "#FAFAFA" },
            navbarButtonText__active: { color: "#EDE9FE" },
          },
        },
      }}
    >
      {children}
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#18181B",
            border: "1px solid #27272A",
            color: "#FAFAFA",
          },
        }}
      />
    </ClerkProvider>
  );
}
