"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "#A855F7",
          colorBackground: "#18181B",
          colorInputBackground: "#27272A",
          colorInputText: "#FAFAFA",
          colorText: "#FAFAFA",
          colorTextSecondary: "#A1A1AA",
          colorNeutral: "#FAFAFA",
          colorTextOnPrimaryBackground: "#FFFFFF",
          borderRadius: "0.75rem",
        },
        elements: {
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
