import { BrandWatermark } from "@/components/marketing/BrandWatermark";
import { Container } from "@/components/marketing/Container";
import { GlassButton } from "@/components/marketing/GlassButton";
import { LogoChip } from "@/components/marketing/LogoChip";
import { PrimaryButton } from "@/components/marketing/PrimaryButton";
import { DEVELOPER_EMAIL, DEVELOPER_SOCIALS } from "@/lib/constants/developer";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Desk", href: "/desk" },
      { label: "How it works", href: "/#how-it-works" },
      { label: "Guardrails", href: "/#guardrails-heading" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/" },
      { label: "Contact", href: "#site-footer" },
    ],
  },
  {
    title: "Social",
    links: [
      ...DEVELOPER_SOCIALS.map((link) => ({ label: link.label, href: link.href })),
      { label: "Email", href: `mailto:${DEVELOPER_EMAIL}` },
    ],
  },
] as const;

export function SiteFooter(_props: { merchantName?: string }) {
  const year = new Date().getFullYear();

  return (
    <footer id="site-footer" className="m-footer">
      <BrandWatermark />
      <Container>
        <div className="m-footer__grid">
          <div className="m-footer__brand">
            <LogoChip href="/" />
            <p className="m-footer__tagline">
              AI commerce without giving AI a blank cheque.
            </p>
            <div className="m-footer__cta">
              <PrimaryButton href="/desk">Open the desk</PrimaryButton>
              <GlassButton href="/#how-it-works">Learn more</GlassButton>
            </div>
          </div>

          <div className="m-footer__links">
            {COLUMNS.map((col) => (
              <div key={col.title} className="m-footer__col">
                <h3 className="m-footer__col-title">{col.title}</h3>
                <ul className="m-footer__col-list">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        {...(link.href.startsWith("http")
                          ? { target: "_blank", rel: "noopener noreferrer" }
                          : {})}
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="m-footer__meta">
          <p>© {year} Peffle</p>
          <p className="m-footer__meta-note">
            Built for the Razorpay Buildathon, AI Growth & Agentic Commerce.
          </p>
        </div>
      </Container>
    </footer>
  );
}
