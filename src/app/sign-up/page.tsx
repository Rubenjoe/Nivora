import type { Metadata } from "next";
import { LandingAuth } from "@/components/landing/landing-auth";

export const metadata: Metadata = {
  title: "Create your account — Nivora",
  description:
    "Create your private space and watch your money finally make sense.",
};

export default function SignUpPage() {
  return <LandingAuth mode="register" />;
}
