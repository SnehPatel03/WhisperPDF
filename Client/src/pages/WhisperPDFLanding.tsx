import { ArrowRight } from "lucide-react";
import { SignInButton } from "@clerk/clerk-react";

export default function WhisperPDFLanding() {
  return (
    <div className="landing-page" id="top">
      <header className="landing-nav">
        <a className="brand-mark" href="#top"><img className="landing-brand-logo" src="/logo.png" alt="" />WhisperPDF</a>
        <SignInButton mode="modal"><button className="nav-cta" type="button">Open your workspace <ArrowRight size={16} /></button></SignInButton>
      </header>

      <main className="landing-main">
        <section className="landing-hero">
          <div className="landing-copy">
            <span className="landing-icon"><img src="logo.png"/></span>
            <p className="eyebrow">YOUR DOCUMENTS, MADE CLEAR</p>
            <h1>Read less.<br /><span>Understand more.</span></h1>
            <p className="landing-description">Ask questions about your PDFs and get clear answers grounded in the source.</p>
            <SignInButton mode="modal"><button className="primary-cta" type="button">Get started <ArrowRight size={17} /></button></SignInButton>
          </div>
          <div className="landing-color-block" aria-hidden="true"><span>01</span><i /></div>
        </section>
      </main>
    </div>
  );
}
