import { CommandFileMockup } from "@/components/landing/command-file-mockup";
import { landingFontClassName } from "@/components/landing/landing-fonts";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingNav } from "@/components/landing/landing-nav";
import {
  CapabilityCardsSection,
  DispatchQueueSection,
  FinalCtaSection,
  LandingFooter,
  SwimlaneTimelineSection,
  TechnicalAppendixSection,
} from "@/components/landing/landing-sections";

export function LandingPage() {
  return (
    <div className={`landing-shell ${landingFontClassName}`}>
      <LandingNav />
      <main className="landing-main">
        <LandingHero />
        <CommandFileMockup />
        <DispatchQueueSection />
        <SwimlaneTimelineSection />
        <CapabilityCardsSection />
        <TechnicalAppendixSection />
        <FinalCtaSection />
      </main>
      <LandingFooter />
    </div>
  );
}
