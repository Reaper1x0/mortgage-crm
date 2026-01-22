import { ReactNode } from "react";
import Card from "../Reusable/Card";
import { cn } from "../../utils/cn";
import HoverBorderGradient from "../Reusable/Aceternity UI/HoverBorderGradient";
import Spotlight from "../Reusable/Aceternity UI/Spotlight";

const AuthPage = ({
  children,
  brandTitle = "Mortgage Docs Automation",
  brandTagline = "Extract → Validate → Auto-populate legal forms",
}: {
  children: ReactNode;
  heading?: string;
  subheading?: string;
  brandTitle?: string;
  brandTagline?: string;
}) => {
  return (
    <div className="min-h-screen bg-background">
      <div className="relative min-h-screen overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-background" />

        {/* subtle grid texture (theme-aware using CSS var) */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(to right, var(--fx-grid-line) 1px, transparent 1px), linear-gradient(to bottom, var(--fx-grid-line) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
          }}
        />

        {/* Content */}
        <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-10">
          <div className="grid w-full grid-cols-1 items-center gap-10 lg:grid-cols-2">
            {/* Left: Brand / Value (minimal, clean) */}
            <div className="hidden lg:block">
              <div className="max-w-xl">
                {/* Brand pill */}
                <div className="inline-flex items-center gap-2 rounded-full border border-card-border bg-card px-4 py-2">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  <span className="text-sm font-semibold text-text">
                    {brandTitle}
                  </span>
                </div>

                <h1 className="mt-6 text-5xl font-extrabold leading-tight text-text">
                  Automated Mortgage Document Analysis
                </h1>

                <p className="mt-4 text-base text-card-text">{brandTagline}</p>

                {/* Key bullets (no card blocks; lightweight) */}
                <div className="mt-8 space-y-4">
                  <div className="flex gap-3">
                    <div className="mt-1 h-8 w-8 rounded-xl border border-card-border bg-card flex items-center justify-center">
                      <span className="h-2 w-2 rounded-full bg-success" />
                    </div>
                    <div>
                      <div className="font-semibold text-text">
                        Traceable extraction
                      </div>
                      <div className="text-sm text-card-text">
                        Every field links back to its source snippet for audit
                        proof.
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="mt-1 h-8 w-8 rounded-xl border border-card-border bg-card flex items-center justify-center">
                      <span className="h-2 w-2 rounded-full bg-warning" />
                    </div>
                    <div>
                      <div className="font-semibold text-text">
                        Validation-first workflow
                      </div>
                      <div className="text-sm text-card-text">
                        Staff review + confidence scoring prevents mismatches
                        across documents.
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="mt-1 h-8 w-8 rounded-xl border border-card-border bg-card flex items-center justify-center">
                      <span className="h-2 w-2 rounded-full bg-primary" />
                    </div>
                    <div>
                      <div className="font-semibold text-text">
                        Form auto-population
                      </div>
                      <div className="text-sm text-card-text">
                        Generate Form 15, affidavits, Schedule G, and request
                        for funds instantly.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer note */}
                <div className="mt-10 text-sm text-card-text">
                  Built for RBC & BMO packages • Designed for compliance •
                  Reduced manual re-typing
                </div>
              </div>
            </div>

            {/* Right: Auth Card (single hero) */}
            <div className="w-full">
              <HoverBorderGradient
                containerClassName="w-full"
                roundedClassName="rounded-3xl"
                className="bg-card"
              >
                <Card
                  className={cn(
                    "relative rounded-3xl p-7 md:p-8",
                    "border border-card-border"
                  )}
                >
                  {/* Spotlight on hover */}
                  <Spotlight className="opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  {/* Body */}
                  <div className="relative z-10">{children}</div>

                  {/* Bottom divider */}
                  <div className="mt-6 border-t border-card-border" />
                  <div className="mt-4 text-xs text-card-text">
                    By continuing, you agree to the organization’s document
                    handling and audit policy.
                  </div>
                </Card>
              </HoverBorderGradient>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
